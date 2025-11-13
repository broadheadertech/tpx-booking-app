import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Users,
  Calendar,
  Settings,
  Calculator,
  CreditCard,
  TrendingUp,
  Download,
  RefreshCw,
  Filter,
  Plus,
  Edit,
  Check,
  X,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Percent,
  Printer,
} from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { createPortal } from "react-dom";
import AlertModal from "../common/AlertModal";

const PayrollManagement = ({ onRefresh, user }) => {
  const [activeView, setActiveView] = useState("overview");
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRecords, setExpandedRecords] = useState(new Set());
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showServiceRatesModal, setShowServiceRatesModal] = useState(false);
  const [showProductRatesModal, setShowProductRatesModal] = useState(false);
  const [showDailyRatesModal, setShowDailyRatesModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteTargetPeriod, setDeleteTargetPeriod] = useState(null);
  const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);
  const [recalculatePeriod, setRecalculatePeriod] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "bank_transfer",
    payment_reference: "",
    notes: "",
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [periodDates, setPeriodDates] = useState({
    startDate: "",
    endDate: "",
  });
  const [serviceRateEdits, setServiceRateEdits] = useState({});
  const [productRateEdits, setProductRateEdits] = useState({});
  const [dailyRateEdits, setDailyRateEdits] = useState({});
  const [savingServiceRates, setSavingServiceRates] = useState(false);
  const [savingProductRates, setSavingProductRates] = useState(false);
  const [savingDailyRates, setSavingDailyRates] = useState(false);

  // Check if user is available
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading user data...</p>
          <p className="text-xs text-gray-500 mt-2">
            Please ensure you are logged in
          </p>
        </div>
      </div>
    );
  }

  // Check if user has branch_id (required for payroll)
  if (!user.branch_id) {
    return (
      <div className="space-y-6">
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-500/20 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Branch Required
          </h3>
          <p className="text-gray-300 mb-4">
            Payroll management requires a branch assignment. Your user account
            is not assigned to a branch.
          </p>
          <p className="text-sm text-gray-400">
            Please contact an administrator to assign your account to a branch.
          </p>
        </div>
      </div>
    );
  }

  // Payroll settings state
  const [payrollSettings, setPayrollSettings] = useState({
    default_commission_rate: 10,
    payout_frequency: "weekly",
    payout_day: 5, // Friday for weekly
    tax_rate: 0,
  });

  // Convex queries - branch-scoped for staff
  // Always call hooks, but pass null/undefined args when conditions aren't met
  const payrollSettingsData = useQuery(
    api.services.payroll.getPayrollSettingsByBranch,
    user && user.branch_id ? { branch_id: user.branch_id } : "skip",
  );

  const payrollPeriods = useQuery(
    api.services.payroll.getPayrollPeriodsByBranch,
    user && user.branch_id ? { branch_id: user.branch_id } : "skip",
  );

  const payrollSummary = useQuery(
    api.services.payroll.getPayrollSummaryByBranch,
    user && user.branch_id ? { branch_id: user.branch_id, limit: 10 } : "skip",
  );

  const barbers = useQuery(
    api.services.barbers.getBarbersByBranch,
    user && user.branch_id ? { branch_id: user.branch_id } : "skip",
  );

  const servicesInBranch = useQuery(
    api.services.services.getActiveServicesByBranch,
    user && user.branch_id ? { branch_id: user.branch_id } : "skip",
  );

  const serviceCommissionRates = useQuery(
    api.services.payroll.getServiceCommissionRatesByBranch,
    user && user.branch_id ? { branch_id: user.branch_id } : "skip",
  );

  const productCommissionRates = useQuery(
    api.services.payroll.getProductCommissionRatesByBranch,
    user && user.branch_id ? { branch_id: user.branch_id } : "skip",
  );

  const productsInBranch = useQuery(
    api.services.products.getAllProducts,
    {},
  );

  const barberDailyRates = useQuery(
    api.services.payroll.getBarberDailyRatesByBranch,
    user && user.branch_id ? { branch_id: user.branch_id } : "skip",
  );

  const barberCommissionRates = useQuery(
    api.services.payroll.getBarberCommissionRatesByBranch,
    user && user.branch_id ? { branch_id: user.branch_id } : "skip",
  );

  // Current period records
  const currentPeriodRecords = useQuery(
    api.services.payroll.getPayrollRecordsByPeriod,
    selectedPeriod && selectedPeriod._id
      ? { payroll_period_id: selectedPeriod._id }
      : "skip",
  );

  // Lazy fetch bookings for selected record when modal is open
  const bookingsForRecord = useQuery(
    api.services.payroll.getBookingsByBarberAndPeriod,
    showBookingsModal && selectedRecord && selectedPeriod
      ? {
          barber_id: selectedRecord.barber_id,
          period_start: selectedPeriod.period_start,
          period_end: selectedPeriod.period_end,
        }
      : "skip",
  );

  // Lazy fetch products for selected record when modal is open
  const productsForRecord = selectedRecord && selectedPeriod
    ? selectedRecord.products_detail || []
    : [];

  // Mutations
  const createOrUpdateSettings = useMutation(
    api.services.payroll.createOrUpdatePayrollSettings,
  );
  const createPayrollPeriod = useMutation(
    api.services.payroll.createPayrollPeriod,
  );
  const calculatePayroll = useMutation(
    api.services.payroll.calculatePayrollForPeriod,
  );
  const markAsPaid = useMutation(api.services.payroll.markPayrollRecordAsPaid);
  const setBarberCommissionRate = useMutation(
    api.services.payroll.setBarberCommissionRate,
  );
  const setServiceCommissionRate = useMutation(
    api.services.payroll.setServiceCommissionRate,
  );
  const setProductCommissionRate = useMutation(
    api.services.payroll.setProductCommissionRate,
  );
  const setBarberDailyRate = useMutation(
    api.services.payroll.setBarberDailyRate,
  );
  const getBookingsForPrint = useAction(
    api.services.payroll.getBookingsForPrint,
  );
  const getBookingsSummaryForPrint = useAction(
    api.services.payroll.getBookingsSummaryForPrint,
  );
  const getServiceCommissionSummary = useAction(
    api.services.payroll.getServiceCommissionSummary,
  );
  const getProductCommissionSummary = useAction(
    api.services.payroll.getProductCommissionSummary,
  );
  const deletePayrollPeriodMutation = useMutation(
    api.services.payroll.deletePayrollPeriod,
  );

  // Initialize settings from data
  useEffect(() => {
    if (payrollSettingsData) {
      setPayrollSettings({
        default_commission_rate: payrollSettingsData.default_commission_rate,
        payout_frequency: payrollSettingsData.payout_frequency,
        payout_day: payrollSettingsData.payout_day,
        tax_rate: payrollSettingsData.tax_rate || 0,
      });
    }
  }, [payrollSettingsData]);

  // Set default selected period to most recent
  useEffect(() => {
    const periodsArray = Array.isArray(payrollPeriods) ? payrollPeriods : [];
    if (periodsArray.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periodsArray[0]);
    }
  }, [payrollPeriods, selectedPeriod]);

  // Keep selected period details in sync with latest data from Convex
  useEffect(() => {
    if (!selectedPeriod?._id) return;

    const periodsArray = Array.isArray(payrollPeriods) ? payrollPeriods : [];
    const updated = periodsArray.find(
      (period) => period._id === selectedPeriod._id,
    );

    if (
      updated &&
      (updated.updatedAt !== selectedPeriod.updatedAt ||
        updated.status !== selectedPeriod.status ||
        updated.total_commissions !== selectedPeriod.total_commissions ||
        updated.total_earnings !== selectedPeriod.total_earnings ||
        updated.total_deductions !== selectedPeriod.total_deductions)
    ) {
      setSelectedPeriod(updated);
    }
  }, [payrollPeriods, selectedPeriod]);

  // Calculate overview statistics
  const overviewStats = useMemo(() => {
    // Handle cases where data might be undefined or "skip" result
    const summaryArray = Array.isArray(payrollSummary) ? payrollSummary : [];
    const barbersArray = Array.isArray(barbers) ? barbers : [];

    // Don't require data to have length - create stats even with empty arrays
    const totalBarbers = barbersArray.filter((b) => b?.is_active).length;
    const lastPeriod = summaryArray[0];
    const previousPeriod = summaryArray[1];

    const currentPayout = lastPeriod?.total_commissions || 0;
    const previousPayout = previousPeriod?.total_commissions || 0;
    const payoutChange =
      previousPayout > 0
        ? ((currentPayout - previousPayout) / previousPayout) * 100
        : 0;

    const pendingPayments = summaryArray.reduce(
      (sum, period) => sum + (period.pending_records || 0),
      0,
    );
    const totalPaid = summaryArray.reduce(
      (sum, period) => sum + (period.paid_records || 0),
      0,
    );

    return {
      totalBarbers,
      currentPayout,
      payoutChange: Math.abs(payoutChange),
      payoutTrend: payoutChange >= 0 ? "up" : "down",
      pendingPayments,
      totalPaid,
      averageCommission: totalBarbers > 0 ? currentPayout / totalBarbers : 0,
    };
  }, [payrollSummary, barbers]);

  // Helper function to calculate default period dates
  const calculateDefaultPeriodDates = () => {
    const frequency = payrollSettingsData?.payout_frequency || "weekly";
    const today = new Date();

    let startDate, endDate;

    if (frequency === "weekly") {
      // Find last Monday or today if it's Monday
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
      startDate = new Date(today);
      startDate.setDate(today.getDate() - daysToMonday);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // 7 days period
    } else if (frequency === "bi_weekly") {
      // 14 days period
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 13);
      endDate = new Date(today);
    } else {
      // monthly
      // Current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  // Handle open period modal
  const handleOpenPeriodModal = () => {
    if (!payrollSettingsData) {
      setError(
        "Please configure payroll settings first before generating periods",
      );
      setShowSettings(true);
      return;
    }

    const defaultDates = calculateDefaultPeriodDates();
    setPeriodDates(defaultDates);
    setShowPeriodModal(true);
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    if (!user?.branch_id) return;

    try {
      setLoading(true);
      setError(null);
      await createOrUpdateSettings({
        branch_id: user.branch_id,
        default_commission_rate: payrollSettings.default_commission_rate,
        payout_frequency: payrollSettings.payout_frequency,
        payout_day: payrollSettings.payout_day,
        tax_rate: payrollSettings.tax_rate,
        created_by: user._id,
      });
      setShowSettings(false);
      // Settings will auto-refresh via Convex real-time updates
    } catch (error) {
      setError("Failed to save payroll settings");
      console.error("Payroll settings error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle create period with custom dates
  const handleCreatePeriod = async () => {
    if (!user?.branch_id || !periodDates.startDate || !periodDates.endDate)
      return;

    try {
      setLoading(true);
      setError(null);

      const startTimestamp = new Date(
        periodDates.startDate + "T00:00:00",
      ).getTime();
      const endTimestamp = new Date(
        periodDates.endDate + "T23:59:59",
      ).getTime();

      // Validate date range
      if (startTimestamp >= endTimestamp) {
        setError("End date must be after start date");
        return;
      }

      await createPayrollPeriod({
        branch_id: user.branch_id,
        period_start: startTimestamp,
        period_end: endTimestamp,
        period_type: payrollSettingsData?.payout_frequency || "weekly",
        created_by: user._id,
      });

      setShowPeriodModal(false);
      setPeriodDates({ startDate: "", endDate: "" });
    } catch (error) {
      setError("Failed to create payroll period");
      console.error("Create period error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle calculate payroll
  const handleCalculatePayroll = async (period) => {
    if (!period?._id) return;

    // If already calculated, show confirmation modal
    if (period.status === "calculated") {
      setRecalculatePeriod(period);
      setShowRecalculateConfirm(true);
      return;
    }

    // Proceed with calculation
    await performCalculatePayroll(period);
  };

  // Perform the actual calculation
  const performCalculatePayroll = async (period) => {
    try {
      setLoading(true);
      setError(null);
      await calculatePayroll({
        payroll_period_id: period._id,
        calculated_by: user._id,
      });
      // Data will auto-refresh via Convex real-time updates
    } catch (error) {
      setError("Failed to calculate payroll");
      console.error("Calculate payroll error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle recalculate confirmation
  const handleRecalculateConfirm = async () => {
    if (recalculatePeriod) {
      await performCalculatePayroll(recalculatePeriod);
    }
    setShowRecalculateConfirm(false);
    setRecalculatePeriod(null);
  };

  // Handle mark as paid
  const handleMarkAsPaid = async (
    recordId,
    paymentMethod,
    reference,
    notes,
  ) => {
    try {
      setLoading(true);
      await markAsPaid({
        payroll_record_id: recordId,
        payment_method: paymentMethod,
        payment_reference: reference,
        notes: notes,
        paid_by: user._id,
      });
      // Data will auto-refresh via Convex real-time updates
    } catch (error) {
      setError("Failed to mark payment as complete");
      console.error("Mark paid error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    onRefresh?.();
    setTimeout(() => setLoading(false), 1000);
  };

  // Handle export to CSV
  const handleExport = () => {
    try {
      let csvContent = "";
      let filename = "";

      if (activeView === "overview") {
        // Export overview summary
        filename = `payroll-overview-${new Date().toISOString().split("T")[0]}.csv`;
        csvContent = "Payroll Overview Summary\n\n";
        csvContent += "Metric,Value\n";
        csvContent += `Active Barbers,${overviewStats.totalBarbers}\n`;
        csvContent += `Current Period Payout,"${formatCurrency(overviewStats.currentPayout)}"\n`;
        csvContent += `Payout Change,${overviewStats.payoutChange.toFixed(1)}%\n`;
        csvContent += `Pending Payments,${overviewStats.pendingPayments}\n`;
        csvContent += `Average Commission,"${formatCurrency(overviewStats.averageCommission)}"\n\n`;

        // Add recent periods
        csvContent += "Recent Payroll Periods\n";
        csvContent +=
          "Period Start,Period End,Type,Status,Total Payout,Barber Count\n";
        const summaryArray = Array.isArray(payrollSummary)
          ? payrollSummary
          : [];
        summaryArray.forEach((period) => {
          csvContent += `"${formatDate(period.period_start)}","${formatDate(period.period_end)}",`;
          csvContent += `${formatPeriodType(period.period_type)},`;
          csvContent += `${period.status === "paid" ? "Paid" : period.status === "calculated" ? "Calculated" : "Draft"},`;
          csvContent += `"${formatCurrency(period.total_commissions || 0)}",`;
          csvContent += `${period.barber_count || 0}\n`;
        });
      } else if (activeView === "periods" && selectedPeriod) {
        // Export selected period details with records
        filename = `payroll-period-${formatDate(selectedPeriod.period_start)}-${formatDate(selectedPeriod.period_end)}.csv`;
        csvContent = `Payroll Period: ${formatDate(selectedPeriod.period_start)} - ${formatDate(selectedPeriod.period_end)}\n`;
        csvContent += `Status: ${selectedPeriod.status}\n`;
        csvContent += `Total Earnings: "${formatCurrency(selectedPeriod.total_earnings || 0)}"\n`;
        csvContent += `Total Commissions: "${formatCurrency(selectedPeriod.total_commissions || 0)}"\n`;
        csvContent += `Total Deductions: "${formatCurrency(selectedPeriod.total_deductions || 0)}"\n\n`;

        csvContent += "Barber Payroll Records\n";
        csvContent +=
          "Barber Name,Services Count,Service Revenue,Gross Commission,Daily Pay,Tax Deduction,Other Deductions,Net Pay,Payment Status\n";

        const recordsArray = Array.isArray(currentPeriodRecords)
          ? currentPeriodRecords
          : [];
        const barbersArray = Array.isArray(barbers) ? barbers : [];

        recordsArray.forEach((record) => {
          const barber = barbersArray.find((b) => b._id === record.barber_id);
          const barberName = barber?.full_name || "Unknown";

          csvContent += `"${barberName}",`;
          csvContent += `${record.total_services || 0},`;
          csvContent += `"${formatCurrency(record.total_service_revenue || 0)}",`;
          csvContent += `"${formatCurrency(record.gross_commission || 0)}",`;
          csvContent += `"${formatCurrency(record.daily_pay || 0)}",`;
          csvContent += `"${formatCurrency(record.tax_deduction || 0)}",`;
          csvContent += `"${formatCurrency(record.other_deductions || 0)}",`;
          csvContent += `"${formatCurrency(record.net_pay || 0)}",`;
          csvContent += `${record.payment_status === "paid" ? "Paid" : "Pending"}\n`;
        });
      } else if (activeView === "settings") {
        // Export payroll settings
        filename = `payroll-settings-${new Date().toISOString().split("T")[0]}.csv`;
        csvContent = "Payroll Settings\n\n";
        csvContent += "Setting,Value\n";
        csvContent += `Default Commission Rate,${payrollSettings.default_commission_rate}%\n`;
        csvContent += `Payout Frequency,${formatPeriodType(payrollSettings.payout_frequency)}\n`;
        csvContent += `Payout Day,${payrollSettings.payout_day}\n`;
        csvContent += `Tax Rate,${payrollSettings.tax_rate}%\n\n`;

        // Add service commission rates
        csvContent += "Service Commission Rates\n";
        csvContent += "Service Name,Commission Rate\n";
        const ratesArray = Array.isArray(serviceCommissionRates)
          ? serviceCommissionRates
          : [];
        const servicesArray = Array.isArray(servicesInBranch)
          ? servicesInBranch
          : [];

        ratesArray.forEach((rate) => {
          const service = servicesArray.find((s) => s._id === rate.service_id);
          csvContent += `"${service?.name || "Unknown"}",${rate.commission_rate}%\n`;
        });

        csvContent += "\nBarber Daily Rates\n";
        csvContent += "Barber Name,Daily Rate\n";
        const dailyRatesArray = Array.isArray(barberDailyRates)
          ? barberDailyRates
          : [];
        const barbersArray = Array.isArray(barbers) ? barbers : [];

        dailyRatesArray.forEach((rate) => {
          const barber = barbersArray.find((b) => b._id === rate.barber_id);
          csvContent += `"${barber?.full_name || "Unknown"}","${formatCurrency(rate.daily_rate)}"\n`;
        });
      } else {
        setError("Please select a view to export");
        return;
      }

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success feedback
      setError(null);
    } catch (error) {
      setError("Failed to export payroll data. Please try again.");
      console.error("Export error:", error);
    }
  };

  // Helpers: build maps for quick lookups
  const serviceRateMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(serviceCommissionRates)
      ? serviceCommissionRates
      : []
    ).forEach((r) => {
      map.set(r.service_id, r);
    });
    return map;
  }, [serviceCommissionRates]);

  const barberDailyRateMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(barberDailyRates) ? barberDailyRates : []).forEach((r) => {
      // keep only active/latest per barber (simple override)
      const existing = map.get(r.barber_id);
      if (!existing || (r.updatedAt || 0) > (existing.updatedAt || 0)) {
        map.set(r.barber_id, r);
      }
    });
    return map;
  }, [barberDailyRates]);

  const productRateMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(productCommissionRates)
      ? productCommissionRates
      : []
    ).forEach((r) => {
      map.set(r.product_id, r);
    });
    return map;
  }, [productCommissionRates]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Printing helpers (via hidden iframe to avoid blank popups)
  const printStyles = `
    body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#111; color:#e5e5e5; padding:24px;}
    .card{background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:20px; margin-bottom:16px;}
    .header{display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px}
    .title{font-weight:800; font-size:18px}
    .grid{display:grid; grid-template-columns:1fr 1fr; gap:16px}
    .row{display:flex; justify-content:space-between; margin:6px 0}
    .muted{color:#9ca3af}
    .accent{color:#ff8c42; font-weight:700}
    hr{border:0; border-top:1px solid #2b2b2b; margin:12px 0}
    .service-summary{margin-top:20px;}
    .service-table{border:1px solid #2b2b2b; border-radius:4px; padding:12px; background:#1a1a1a;}
    .service-header{font-weight:600; color:#9ca3af; margin-bottom:4px; display:flex; justify-content:space-between;}
    .service-header span{flex:3; text-align:left;}
    .service-header span:nth-child(2){flex:1; text-align:center;}
    .service-header span:nth-child(3){flex:1; text-align:right;}
    @media print { body{padding:0;background:#fff;color:#111} .card{border-color:#ddd;background:#fff} .accent{color:#111} .service-table{border-color:#ddd;background:#fff} }
  `;

  const recordSection = (record) => {
    const format = (amt) =>
      new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
      }).format(amt || 0);
    const dateRange = selectedPeriod
      ? `${formatDate(selectedPeriod.period_start)} – ${formatDate(selectedPeriod.period_end)}`
      : "";

    // Generate service commission summary HTML
    let serviceSummaryHtml = "";
    if (
      record.service_summary &&
      record.service_summary.services &&
      record.service_summary.services.length > 0
    ) {
      const serviceRows = record.service_summary.services
        .map((service) => {
          return `
            <div class="row">
              <span style="flex: 3; text-align: left;">${service.service_name}</span>
              <span style="flex: 1; text-align: center;">${service.quantity}</span>
              <span style="flex: 1; text-align: right;">${format(service.total_commission)}</span>
            </div>
          `;
        })
        .join("");

      const totalsRow = `
        <div class="row" style="font-weight: 800; border-top: 1px solid #2b2b2b; padding-top: 6px; margin-top: 6px;">
          <span style="flex: 3; text-align: left;">TOTALS:</span>
          <span style="flex: 1; text-align: center;">${record.service_summary.totals.quantity}</span>
          <span style="flex: 1; text-align: right;">${format(record.service_summary.totals.commission)}</span>
        </div>
      `;

      serviceSummaryHtml = `
        <div class="service-summary">
          <div style="font-weight: 600; margin-bottom: 8px; color: white;">Service Commission Summary</div>
          <div class="service-table">
            <div class="service-header">
              <span>Service Name</span>
              <span>Qty</span>
              <span>Commission</span>
            </div>
            ${serviceRows}
            ${totalsRow}
          </div>
        </div>
      `;
    }

    // Generate product commission summary HTML
    let productSummaryHtml = "";
    if (
      record.product_summary &&
      record.product_summary.products &&
      record.product_summary.products.length > 0
    ) {
      const productRows = record.product_summary.products
        .map((product) => {
          const commissionDisplay = product.commission_type === "fixed_amount"
            ? `${format(product.commission_value)}/unit`
            : `${product.commission_value}%`;
          return `
            <div class="row">
              <span style="flex: 3; text-align: left;">${product.product_name} <span class="muted">(${commissionDisplay})</span></span>
              <span style="flex: 1; text-align: center;">${product.quantity}</span>
              <span style="flex: 1; text-align: right;">${format(product.total_commission)}</span>
            </div>
          `;
        })
        .join("");

      const productTotalsRow = `
        <div class="row" style="font-weight: 800; border-top: 1px solid #2b2b2b; padding-top: 6px; margin-top: 6px;">
          <span style="flex: 3; text-align: left;">TOTALS:</span>
          <span style="flex: 1; text-align: center;">${record.product_summary.totals.quantity}</span>
          <span style="flex: 1; text-align: right;">${format(record.product_summary.totals.commission)}</span>
        </div>
      `;

      productSummaryHtml = `
        <div class="service-summary">
          <div style="font-weight: 600; margin-bottom: 8px; color: white;">Product Commission Summary</div>
          <div class="service-table">
            <div class="service-header">
              <span>Product Name</span>
              <span>Qty</span>
              <span>Commission</span>
            </div>
            ${productRows}
            ${productTotalsRow}
          </div>
        </div>
      `;
    }

    // Product details list
    let productsListHtml = "";
    const productsDetail = Array.isArray(record.products_detail) ? record.products_detail : [];
    if (productsDetail.length) {
      // Group by date
      const productsByDate = {};
      productsDetail.forEach((p) => {
        const dateKey = new Date(p.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        if (!productsByDate[dateKey]) {
          productsByDate[dateKey] = [];
        }
        productsByDate[dateKey].push(p);
      });

      const productBlocks = Object.keys(productsByDate)
        .sort((a, b) => new Date(a) - new Date(b))
        .map((dateKey) => {
          const items = productsByDate[dateKey];
          const dateTotal = items.reduce((sum, p) => sum + p.total_amount, 0);
          const dateCommission = items.reduce((sum, p) => sum + p.commission_amount, 0);
          
          const rows = items
            .map((p) => {
              const commissionLabel = p.commission_type === "fixed_amount" 
                ? `${format(p.commission_rate)}/unit` 
                : `${p.commission_rate}%`;
              return `<div class="row"><span><span class="muted">${dateKey}</span> — ${p.product_name} <span class="muted">• Qty: ${p.quantity} • ${commissionLabel} • ${p.customer_name} • ${p.transaction_id}</span></span><span>${format(p.total_amount)} <span class="muted">(+${format(p.commission_amount)})</span></span></div>`;
            })
            .join("");
          
          const footer = `<div class="row" style="font-weight:600"><span>Total (${dateKey})</span><span>${format(dateTotal)} | Commission: ${format(dateCommission)}</span></div>`;
          return rows + footer + "<hr/>";
        })
        .join("");

      const grandTotal = productsDetail.reduce((sum, p) => sum + p.total_amount, 0);
      const grandCommission = productsDetail.reduce((sum, p) => sum + p.commission_amount, 0);
      const grand = `<div class="row" style="font-weight:800"><span>Product Grand Total</span><span>${format(grandTotal)} | Commission: ${format(grandCommission)}</span></div>`;
      
      productsListHtml = `
        <hr/>
        <div style="font-weight: 600; margin: 12px 0 8px; color: white;">Product Transaction Details</div>
        ${productBlocks}${grand}
      `;
    }

    // bookings per-date with totals & commissions if available
    let bookingsHtml = "";
    if (
      record.bookings_summary &&
      Array.isArray(record.bookings_summary.groups) &&
      record.bookings_summary.groups.length
    ) {
      const blocks = record.bookings_summary.groups
        .map((g) => {
          const dateLabel = new Date(g.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const rows = (g.rows || [])
            .map((b) => {
              const tm = (b.time || "--:--").slice(0, 5);
              return `<div class="row"><span><span class="muted">${dateLabel} ${tm}</span> — ${b.service_name} <span class="muted">• ${b.customer_name} • ${b.booking_code}</span></span><span>${format(b.price)}</span></div>`;
            })
            .join("");
          const footer = `<div class="row" style="font-weight:600"><span>Total (${dateLabel})</span><span>${format(g.totalAmount)} | Sales: ${format(g.totalAmount)} | Selected Pay: ${format(g.selectedPay || 0)}</span></div>`;
          return rows + footer + "<hr/>";
        })
        .join("");
      const grand = `<div class="row" style="font-weight:800"><span>Service Grand Total</span><span>${format(record.bookings_summary.grandTotalAmount)} | Sales: ${format(record.bookings_summary.grandTotalAmount)} | Final Daily Salary: ${format(record.bookings_summary.grandTotalSelectedPay || 0)}</span></div>`;
      bookingsHtml = `<hr/><div style="font-weight: 600; margin: 12px 0 8px; color: white;">Service Booking Details</div>${blocks}${grand}`;
    } else {
      const items = Array.isArray(record.bookings_detail)
        ? record.bookings_detail
        : [];
      if (items.length) {
        const rows = items
          .slice()
          .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0))
          .map((b) => {
            const dt = b.date
              ? new Date(b.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : new Date(b.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
            const tm = (b.time || "--:--").slice(0, 5);
            return `<div class="row"><span><span class="muted">${dt} ${tm}</span> — ${b.service_name} <span class="muted">• ${b.customer_name} • ${b.booking_code}</span></span><span>${format(b.price)}</span></div>`;
          })
          .join("");
        bookingsHtml = `<hr/><div style="font-weight: 600; margin: 12px 0 8px; color: white;">Service Booking Details</div>${rows}`;
      }
    }
    return `
      <div class="card">
        <div class="header">
          <div>
            <div class="title">${record.barber_name}</div>
            <div class="muted">Payroll Period: ${dateRange}</div>
          </div>
          <div class="accent">Grand Total: ${format(record.net_pay)}</div>
        </div>
        <hr/>
        <div class="grid">
          <div>
            <div class="row"><span class="muted">Services</span><span>${record.total_services}</span></div>
            <div class="row"><span class="muted">Service Revenue</span><span>${format(record.total_service_revenue)}</span></div>
            <div class="row"><span class="muted">Products Sold</span><span>${record.total_products || 0}</span></div>
            <div class="row"><span class="muted">Product Revenue</span><span>${format(record.total_product_revenue || 0)}</span></div>
          </div>
          <div>
            <div class="row"><span class="muted">Service Commission</span><span>${format(record.gross_commission - (record.product_commission || 0))}</span></div>
            <div class="row"><span class="muted">Product Commission</span><span>${format(record.product_commission || 0)}</span></div>
            <div class="row"><span class="muted">Final Daily Salary</span><span>${format(record.daily_pay || 0)}</span></div>
            <hr/>
            <div class="row" style="font-weight:800"><span>Grand Total</span><span class="accent">${format(record.net_pay)}</span></div>
          </div>
        </div>
        ${serviceSummaryHtml}
        ${productSummaryHtml}
        ${productsListHtml}
        ${bookingsHtml}
      </div>
    `;
  };

  const buildDoc = (title, body) => `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>${printStyles}</style>
      </head>
      <body>${body}</body>
    </html>`;

  const printHtml = (html) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 100);
      }, 150);
    };
  };

  const handlePrintRecord = async (record) => {
    let enriched = record;
    if (!record.bookings_detail || record.bookings_detail.length === 0) {
      if (selectedPeriod) {
        try {
          const [items, summary, serviceSummary, productSummary] = await Promise.all([
            getBookingsForPrint({
              barber_id: record.barber_id,
              period_start: selectedPeriod.period_start,
              period_end: selectedPeriod.period_end,
            }),
            getBookingsSummaryForPrint({
              barber_id: record.barber_id,
              period_start: selectedPeriod.period_start,
              period_end: selectedPeriod.period_end,
            }),
            getServiceCommissionSummary({
              barber_id: record.barber_id,
              period_start: selectedPeriod.period_start,
              period_end: selectedPeriod.period_end,
            }),
            getProductCommissionSummary({
              barber_id: record.barber_id,
              period_start: selectedPeriod.period_start,
              period_end: selectedPeriod.period_end,
            }),
          ]);
          enriched = {
            ...record,
            bookings_detail: items,
            bookings_summary: summary,
            service_summary: serviceSummary,
            product_summary: productSummary,
          };
        } catch (e) {
          // ignore and print without bookings
        }
      }
    } else if (selectedPeriod) {
      // Even if we have bookings_detail, fetch service and product summary for print
      try {
        const [serviceSummary, productSummary] = await Promise.all([
          getServiceCommissionSummary({
            barber_id: record.barber_id,
            period_start: selectedPeriod.period_start,
            period_end: selectedPeriod.period_end,
          }),
          getProductCommissionSummary({
            barber_id: record.barber_id,
            period_start: selectedPeriod.period_start,
            period_end: selectedPeriod.period_end,
          }),
        ]);
        enriched = {
          ...record,
          service_summary: serviceSummary,
          product_summary: productSummary,
        };
      } catch (e) {
        // ignore and print without summaries
        enriched = record;
      }
    }
    const html = buildDoc(
      `Payroll – ${record.barber_name}`,
      recordSection(enriched),
    );
    printHtml(html);
  };

  const handlePrintAll = async () => {
    const records = Array.isArray(currentPeriodRecords)
      ? currentPeriodRecords
      : [];
    const enriched = await Promise.all(
      records.map(async (r) => {
        if (!selectedPeriod) return r;
        try {
          const [items, summary, serviceSummary, productSummary] = await Promise.all([
            r.bookings_detail && r.bookings_detail.length > 0
              ? Promise.resolve(r.bookings_detail)
              : getBookingsForPrint({
                  barber_id: r.barber_id,
                  period_start: selectedPeriod.period_start,
                  period_end: selectedPeriod.period_end,
                }),
            getBookingsSummaryForPrint({
              barber_id: r.barber_id,
              period_start: selectedPeriod.period_start,
              period_end: selectedPeriod.period_end,
            }),
            getServiceCommissionSummary({
              barber_id: r.barber_id,
              period_start: selectedPeriod.period_start,
              period_end: selectedPeriod.period_end,
            }),
            getProductCommissionSummary({
              barber_id: r.barber_id,
              period_start: selectedPeriod.period_start,
              period_end: selectedPeriod.period_end,
            }),
          ]);
          return {
            ...r,
            bookings_detail: items,
            bookings_summary: summary,
            service_summary: serviceSummary,
            product_summary: productSummary,
          };
        } catch (e) {
          return r;
        }
      }),
    );
    const sections = enriched.map((r) => recordSection(r)).join("\n");
    const title = selectedPeriod
      ? `Payroll – ${formatDate(selectedPeriod.period_start)} to ${formatDate(selectedPeriod.period_end)}`
      : "Payroll – All";
    const html = buildDoc(title, sections);
    printHtml(html);
  };

  // Format period type
  const formatPeriodType = (type) => {
    switch (type) {
      case "weekly":
        return "Weekly";
      case "bi_weekly":
        return "Bi-Weekly";
      case "monthly":
        return "Monthly";
      default:
        return type;
    }
  };

  // Toggle record expansion
  const toggleRecordExpansion = (recordId) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedRecords(newExpanded);
  };

  // Render period creation modal
  const renderPeriodModal = () => {
    if (!showPeriodModal) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowPeriodModal(false)}
          />
          <div className="relative w-full max-w-md transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
              <h2 className="text-xl font-bold text-white">
                Create Payroll Period
              </h2>
              <button
                onClick={() => setShowPeriodModal(false)}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Period Start Date
                  </label>
                  <input
                    type="date"
                    value={periodDates.startDate}
                    onChange={(e) =>
                      setPeriodDates((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Period End Date
                  </label>
                  <input
                    type="date"
                    value={periodDates.endDate}
                    onChange={(e) =>
                      setPeriodDates((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  />
                </div>

                <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 p-3">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Period Summary
                  </h4>
                  <div className="space-y-1 text-xs text-gray-400">
                    <p>
                      Frequency:{" "}
                      {payrollSettingsData?.payout_frequency || "weekly"}
                    </p>
                    <p>
                      Duration:{" "}
                      {periodDates.startDate && periodDates.endDate
                        ? Math.ceil(
                            (new Date(periodDates.endDate) -
                              new Date(periodDates.startDate)) /
                              (1000 * 60 * 60 * 24),
                          ) + 1
                        : 0}{" "}
                      days
                    </p>
                    <p>
                      Commission Rate:{" "}
                      {payrollSettingsData?.default_commission_rate || 10}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowPeriodModal(false)}
                  className="flex-1 px-4 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#555555]/70 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePeriod}
                  disabled={
                    loading || !periodDates.startDate || !periodDates.endDate
                  }
                  className="flex-1 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create Period"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  // Render payroll settings modal
  const renderSettingsModal = () => {
    if (!showSettings) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative w-full max-w-md transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
              <h2 className="text-xl font-bold text-white">Payroll Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={payrollSettings.default_commission_rate}
                    onChange={(e) =>
                      setPayrollSettings((prev) => ({
                        ...prev,
                        default_commission_rate:
                          parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payout Frequency
                  </label>
                  <select
                    value={payrollSettings.payout_frequency}
                    onChange={(e) =>
                      setPayrollSettings((prev) => ({
                        ...prev,
                        payout_frequency: e.target.value,
                      }))
                    }
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi_weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {payrollSettings.payout_frequency === "weekly"
                      ? "Payout Day (0=Sunday, 6=Saturday)"
                      : "Payout Day of Month"}
                  </label>
                  <input
                    type="number"
                    min={
                      payrollSettings.payout_frequency === "weekly" ? "0" : "1"
                    }
                    max={
                      payrollSettings.payout_frequency === "weekly" ? "6" : "31"
                    }
                    value={payrollSettings.payout_day}
                    onChange={(e) =>
                      setPayrollSettings((prev) => ({
                        ...prev,
                        payout_day: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={payrollSettings.tax_rate}
                    onChange={(e) =>
                      setPayrollSettings((prev) => ({
                        ...prev,
                        tax_rate: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  // Render Bookings modal (grouped by date)
  const renderBookingsModal = () => {
    if (!showBookingsModal || !selectedRecord) return null;

    const items = Array.isArray(bookingsForRecord) ? bookingsForRecord : [];
    const serviceRates = Array.isArray(serviceCommissionRates)
      ? serviceCommissionRates
      : [];
    const payrollSettings = payrollSettingsData || {
      default_commission_rate: 10,
    };

    // Create service rate map for quick lookup
    const serviceRateMap = new Map();
    serviceRates.forEach((rate) => {
      if (rate.is_active) {
        serviceRateMap.set(rate.service_id, rate.commission_rate);
      }
    });

    // Get barber's fallback commission rate
    const barberCommissionRate = barberCommissionRates?.find(
      (r) => r.barber_id === selectedRecord.barber_id,
    );
    const fallbackRate =
      barberCommissionRate?.commission_rate ||
      payrollSettings.default_commission_rate ||
      10;

    // Calculate commission for each booking
    const itemsWithCommission = items.map((booking) => {
      const serviceRate =
        serviceRateMap.get(booking.service_id) || fallbackRate;
      const serviceCommission = (booking.price * serviceRate) / 100;

      return {
        ...booking,
        commission_rate: serviceRate,
        commission_amount: serviceCommission,
      };
    });

    // Group by booking date
    const grouped = itemsWithCommission.reduce((acc, b) => {
      const key = b.date || new Date(b.updatedAt).toISOString().split("T")[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(b) - new Date(a),
    );

    // Calculate totals
    const totalRevenue = itemsWithCommission.reduce(
      (sum, b) => sum + (b.price || 0),
      0,
    );
    const totalCommission = itemsWithCommission.reduce(
      (sum, b) => sum + b.commission_amount,
      0,
    );

    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBookingsModal(false)}
          />
          <div className="relative w-full max-w-4xl rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Bookings • {selectedRecord.barber_name}
                </h2>
                <p className="text-sm text-gray-400">
                  {formatDate(selectedPeriod.period_start)} –{" "}
                  {formatDate(selectedPeriod.period_end)}
                </p>
              </div>
              <button
                onClick={() => setShowBookingsModal(false)}
                className="w-8 h-8 rounded-lg bg-[#3A3A3A]/60 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-300 hover:text-[#FF8C42]" />
              </button>
            </div>

            {/* Summary Stats */}
            <div className="px-6 py-4 bg-[#171717] border-b border-[#2A2A2A]/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {itemsWithCommission.length}
                  </div>
                  <div className="text-sm text-gray-400">Total Bookings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#FF8C42]">
                    {formatCurrency(totalRevenue)}
                  </div>
                  <div className="text-sm text-gray-400">Total Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {formatCurrency(totalCommission)}
                  </div>
                  <div className="text-sm text-gray-400">Total Commission</div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {bookingsForRecord === undefined && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading bookings…</p>
                </div>
              )}

              {bookingsForRecord !== undefined && sortedDates.length === 0 && (
                <div className="bg-[#121212] border border-[#2A2A2A]/50 rounded-lg p-6 text-center text-gray-400">
                  No completed, paid bookings found for this period.
                </div>
              )}

              {sortedDates.map((date) => (
                <div
                  key={date}
                  className="rounded-xl bg-[#121212] border border-[#2A2A2A]/50 overflow-hidden"
                >
                  <div className="px-5 py-3 bg-[#171717] border-b border-[#2A2A2A] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#FF8C42]" />
                      <span className="text-white font-medium">
                        {new Date(date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {grouped[date].length} booking
                      {grouped[date].length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="divide-y divide-[#222]">
                    {grouped[date].map((b) => {
                      const prettyTime =
                        b.time && b.time.length >= 4
                          ? b.time.slice(0, 5)
                          : "--:--";
                      return (
                        <div
                          key={b.id}
                          className="px-5 py-4 hover:bg-[#161616] transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="shrink-0">
                                <div className="inline-flex items-center justify-center rounded-md bg-[#232323] border border-[#2A2A2A]/50 px-3 py-1.5">
                                  <span className="font-mono text-sm font-semibold text-[#FF8C42] leading-none">
                                    {prettyTime}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-white font-semibold">
                                  {b.service_name}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {b.customer_name} • {b.booking_code}
                                </div>

                                {/* Commission Details */}
                                <div className="mt-2 flex items-center gap-4 text-xs">
                                  <div className="flex items-center gap-1">
                                    <Percent className="w-3 h-3 text-blue-400" />
                                    <span className="text-gray-400">Rate:</span>
                                    <span className="text-blue-400 font-medium">
                                      {b.commission_rate}%
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3 text-green-400" />
                                    <span className="text-gray-400">
                                      Commission:
                                    </span>
                                    <span className="text-green-400 font-medium">
                                      {formatCurrency(b.commission_amount)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right pl-3 shrink-0">
                              <div className="text-[#FF8C42] font-semibold text-lg">
                                {formatCurrency(b.price)}
                              </div>
                              <div className="text-xs text-gray-400">
                                Service Price
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  // Render Products modal (grouped by date)
  const renderProductsModal = () => {
    if (!showProductsModal || !selectedRecord) return null;

    const items = productsForRecord;
    const productRates = Array.isArray(productCommissionRates)
      ? productCommissionRates
      : [];
    const payrollSettings = payrollSettingsData || {
      default_commission_rate: 10,
    };

    // Create product rate map for quick lookup
    const prodRateMap = new Map();
    productRates.forEach((rate) => {
      if (rate.is_active) {
        prodRateMap.set(rate.product_id, rate.commission_rate);
      }
    });

    // Get barber's fallback commission rate
    const barberCommissionRate = barberCommissionRates?.find(
      (r) => r.barber_id === selectedRecord.barber_id,
    );
    const fallbackRate =
      barberCommissionRate?.commission_rate ||
      payrollSettings.default_commission_rate ||
      10;

    // Group by date
    const grouped = items.reduce((acc, p) => {
      const key = p.date
        ? new Date(p.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(b) - new Date(a),
    );

    // Calculate totals
    const totalQuantity = items.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalRevenue = items.reduce(
      (sum, p) => sum + (p.total_amount || 0),
      0,
    );
    const totalCommission = items.reduce(
      (sum, p) => sum + (p.commission_amount || 0),
      0,
    );

    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowProductsModal(false)}
          />
          <div className="relative w-full max-w-4xl rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Products • {selectedRecord.barber_name}
                </h2>
                <p className="text-sm text-gray-400">
                  {formatDate(selectedPeriod.period_start)} –{" "}
                  {formatDate(selectedPeriod.period_end)}
                </p>
              </div>
              <button
                onClick={() => setShowProductsModal(false)}
                className="w-8 h-8 rounded-lg bg-[#3A3A3A]/60 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-300 hover:text-[#FF8C42]" />
              </button>
            </div>

            {/* Summary Stats */}
            <div className="px-6 py-4 bg-[#171717] border-b border-[#2A2A2A]/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {totalQuantity}
                  </div>
                  <div className="text-sm text-gray-400">Total Products Sold</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    {formatCurrency(totalRevenue)}
                  </div>
                  <div className="text-sm text-gray-400">Total Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {formatCurrency(totalCommission)}
                  </div>
                  <div className="text-sm text-gray-400">Total Commission</div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {items.length === 0 && (
                <div className="bg-[#121212] border border-[#2A2A2A]/50 rounded-lg p-6 text-center text-gray-400">
                  No product sales found for this period.
                </div>
              )}

              {sortedDates.map((date) => (
                <div
                  key={date}
                  className="rounded-xl bg-[#121212] border border-[#2A2A2A]/50 overflow-hidden"
                >
                  <div className="px-5 py-3 bg-[#171717] border-b border-[#2A2A2A] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-cyan-400" />
                      <span className="text-white font-medium">
                        {new Date(date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {grouped[date].length} product
                      {grouped[date].length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="divide-y divide-[#222]">
                    {grouped[date].map((p, idx) => {
                      return (
                        <div
                          key={`${p.transaction_id || idx}-${idx}`}
                          className="px-5 py-4 hover:bg-[#161616] transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="flex-1 min-w-0">
                                <div className="text-white font-semibold">
                                  {p.product_name}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {p.customer_name || "Walk-in"} • Qty: {p.quantity}
                                </div>

                                {/* Commission Details */}
                                <div className="mt-2 flex items-center gap-4 text-xs">
                                  <div className="flex items-center gap-1">
                                    <Percent className="w-3 h-3 text-blue-400" />
                                    <span className="text-gray-400">
                                      {p.commission_type === "fixed_amount" ? "Fixed:" : "Rate:"}
                                    </span>
                                    <span className="text-blue-400 font-medium">
                                      {p.commission_type === "fixed_amount" 
                                        ? `${formatCurrency(p.commission_rate || 0)}/unit`
                                        : `${p.commission_rate || fallbackRate}%`
                                      }
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3 text-green-400" />
                                    <span className="text-gray-400">
                                      Commission:
                                    </span>
                                    <span className="text-green-400 font-medium">
                                      {formatCurrency(p.commission_amount || 0)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right pl-3 shrink-0">
                              <div className="text-cyan-400 font-semibold text-lg">
                                {formatCurrency(p.total_amount || 0)}
                              </div>
                              <div className="text-xs text-gray-400">
                                Product Revenue
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  // Render Service Commission Rates modal
  const renderServiceRatesModal = () => {
    if (!showServiceRatesModal) return null;
    const servicesArray = Array.isArray(servicesInBranch)
      ? servicesInBranch
      : [];

    const handleSaveAll = async () => {
      if (!user?.branch_id) return;
      const entries = Object.entries(serviceRateEdits)
        .map(([serviceId, val]) => ({
          serviceId,
          rate: parseFloat(String(val)),
        }))
        .filter((e) => !isNaN(e.rate))
        .filter((e) => {
          const existing = serviceRateMap.get(e.serviceId);
          return (
            !existing || Number(existing.commission_rate) !== Number(e.rate)
          );
        });

      if (entries.length === 0) return;
      setSavingServiceRates(true);
      try {
        for (const e of entries) {
          await setServiceCommissionRate({
            branch_id: user.branch_id,
            service_id: e.serviceId,
            commission_rate: e.rate,
            created_by: user._id,
          });
        }
        setServiceRateEdits({});
      } catch (err) {
        console.error(err);
        setError("Failed to save some service commission rates");
      } finally {
        setSavingServiceRates(false);
      }
    };
    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowServiceRatesModal(false)}
          />
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
              <h2 className="text-xl font-bold text-white">
                Service Commission Rates
              </h2>
              <button
                onClick={() => setShowServiceRatesModal(false)}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
            <div className="p-6">
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-[#2A2A2A]/50">
                      <th className="text-left py-2 px-2">Service</th>
                      <th className="text-right py-2 px-2">Current Rate</th>
                      <th className="text-right py-2 px-2">New Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicesArray.map((svc) => {
                      const existing = serviceRateMap.get(svc._id);
                      const value =
                        serviceRateEdits[svc._id] ??
                        existing?.commission_rate ??
                        "";
                      return (
                        <tr
                          key={svc._id}
                          className="border-b border-[#2A2A2A]/20"
                        >
                          <td className="py-2 px-2 text-white">{svc.name}</td>
                          <td className="py-2 px-2 text-right text-gray-300">
                            {existing ? `${existing.commission_rate}%` : "—"}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={value}
                              onChange={(e) =>
                                setServiceRateEdits((prev) => ({
                                  ...prev,
                                  [svc._id]: e.target.value,
                                }))
                              }
                              className="w-28 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent text-right"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowServiceRatesModal(false)}
                  className="px-4 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] text-sm"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={
                    savingServiceRates ||
                    Object.keys(serviceRateEdits).length === 0
                  }
                  className="px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 disabled:opacity-50 text-sm"
                >
                  {savingServiceRates ? "Saving…" : "Save All Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  // Render Product Commission Rates modal
  const renderProductRatesModal = () => {
    if (!showProductRatesModal) return null;
    const productsArray = Array.isArray(productsInBranch)
      ? productsInBranch
      : [];

    const handleSaveAll = async () => {
      if (!user?.branch_id) return;
      const entries = Object.entries(productRateEdits)
        .map(([productId, val]) => {
          const existing = productRateMap.get(productId);
          const type = val.type || existing?.commission_type || "percentage";
          return {
            productId,
            type,
            rate: type === "percentage" ? parseFloat(String(val.value)) : undefined,
            amount: type === "fixed_amount" ? parseFloat(String(val.value)) : undefined,
          };
        })
        .filter((e) => {
          if (e.type === "percentage" && (isNaN(e.rate) || e.rate === undefined)) return false;
          if (e.type === "fixed_amount" && (isNaN(e.amount) || e.amount === undefined)) return false;
          return true;
        })
        .filter((e) => {
          const existing = productRateMap.get(e.productId);
          if (!existing) return true;
          if (existing.commission_type !== e.type) return true;
          if (e.type === "percentage" && Number(existing.commission_rate) !== Number(e.rate)) return true;
          if (e.type === "fixed_amount" && Number(existing.fixed_amount) !== Number(e.amount)) return true;
          return false;
        });

      if (entries.length === 0) return;
      setSavingProductRates(true);
      try {
        for (const e of entries) {
          await setProductCommissionRate({
            branch_id: user.branch_id,
            product_id: e.productId,
            commission_type: e.type,
            commission_rate: e.rate,
            fixed_amount: e.amount,
            created_by: user._id,
          });
        }
        setProductRateEdits({});
      } catch (err) {
        console.error(err);
        setError("Failed to save some product commission rates");
      } finally {
        setSavingProductRates(false);
      }
    };
    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowProductRatesModal(false)}
          />
          <div className="relative w-full max-w-3xl rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Product Commission Rates
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Set fixed amount or percentage commission for each product
                </p>
              </div>
              <button
                onClick={() => setShowProductRatesModal(false)}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
            <div className="p-6">
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-[#2A2A2A]/50">
                      <th className="text-left py-2 px-2">Product</th>
                      <th className="text-center py-2 px-2">Current</th>
                      <th className="text-center py-2 px-2">Type</th>
                      <th className="text-right py-2 px-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsArray.map((prod) => {
                      const existing = productRateMap.get(prod._id);
                      const editData = productRateEdits[prod._id];
                      const currentType = editData?.type || existing?.commission_type || "percentage";
                      const currentValue = editData?.value ?? 
                        (existing ? 
                          (existing.commission_type === "fixed_amount" ? existing.fixed_amount : existing.commission_rate) 
                          : "");
                      
                      return (
                        <tr
                          key={prod._id}
                          className="border-b border-[#2A2A2A]/20"
                        >
                          <td className="py-2 px-2 text-white">{prod.name}</td>
                          <td className="py-2 px-2 text-center text-gray-300">
                            {existing ? (
                              existing.commission_type === "fixed_amount" ? 
                                `₱${existing.fixed_amount}` : 
                                `${existing.commission_rate}%`
                            ) : "—"}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <select
                              value={currentType}
                              onChange={(e) =>
                                setProductRateEdits((prev) => ({
                                  ...prev,
                                  [prod._id]: {
                                    type: e.target.value,
                                    value: currentValue
                                  },
                                }))
                              }
                              className="w-32 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                            >
                              <option value="percentage">Percentage</option>
                              <option value="fixed_amount">Fixed Amount</option>
                            </select>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {currentType === "percentage" && <span className="text-gray-400">%</span>}
                              {currentType === "fixed_amount" && <span className="text-gray-400">₱</span>}
                              <input
                                type="number"
                                min="0"
                                max={currentType === "percentage" ? "100" : undefined}
                                step={currentType === "percentage" ? "0.1" : "1"}
                                value={currentValue}
                                onChange={(e) =>
                                  setProductRateEdits((prev) => ({
                                    ...prev,
                                    [prod._id]: {
                                      type: currentType,
                                      value: e.target.value
                                    },
                                  }))
                                }
                                placeholder={currentType === "percentage" ? "0-100" : "Amount"}
                                className="w-24 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent text-right"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowProductRatesModal(false)}
                  className="px-4 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] text-sm"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={
                    savingProductRates ||
                    Object.keys(productRateEdits).length === 0
                  }
                  className="px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 disabled:opacity-50 text-sm"
                >
                  {savingProductRates ? "Saving…" : "Save All Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  // Render Daily Rates modal
  const renderDailyRatesModal = () => {
    if (!showDailyRatesModal) return null;
    const barbersArray = Array.isArray(barbers) ? barbers : [];

    const handleSaveAll = async () => {
      if (!user?.branch_id) return;
      const entries = Object.entries(dailyRateEdits)
        .map(([barberId, val]) => ({ barberId, rate: parseFloat(String(val)) }))
        .filter((e) => !isNaN(e.rate))
        .filter((e) => {
          const existing = barberDailyRateMap.get(e.barberId);
          return !existing || Number(existing.daily_rate) !== Number(e.rate);
        });

      if (entries.length === 0) return;
      setSavingDailyRates(true);
      try {
        for (const e of entries) {
          await setBarberDailyRate({
            barber_id: e.barberId,
            branch_id: user.branch_id,
            daily_rate: e.rate,
            created_by: user._id,
          });
        }
        setDailyRateEdits({});
      } catch (err) {
        console.error(err);
        setError("Failed to save some barber daily rates");
      } finally {
        setSavingDailyRates(false);
      }
    };
    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDailyRatesModal(false)}
          />
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
              <h2 className="text-xl font-bold text-white">
                Barber Daily Rates
              </h2>
              <button
                onClick={() => setShowDailyRatesModal(false)}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
            <div className="p-6">
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-[#2A2A2A]/50">
                      <th className="text-left py-2 px-2">Barber</th>
                      <th className="text-right py-2 px-2">
                        Current Daily Rate
                      </th>
                      <th className="text-right py-2 px-2">New Daily Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barbersArray.map((b) => {
                      const existing = barberDailyRateMap.get(b._id);
                      const value =
                        dailyRateEdits[b._id] ?? existing?.daily_rate ?? "";
                      return (
                        <tr
                          key={b._id}
                          className="border-b border-[#2A2A2A]/20"
                        >
                          <td className="py-2 px-2 text-white">
                            {b.full_name}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-300">
                            {existing
                              ? formatCurrency(existing.daily_rate)
                              : "—"}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={value}
                              onChange={(e) =>
                                setDailyRateEdits((prev) => ({
                                  ...prev,
                                  [b._id]: e.target.value,
                                }))
                              }
                              className="w-28 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent text-right"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowDailyRatesModal(false)}
                  className="px-4 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] text-sm"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={
                    savingDailyRates || Object.keys(dailyRateEdits).length === 0
                  }
                  className="px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 disabled:opacity-50 text-sm"
                >
                  {savingDailyRates ? "Saving…" : "Save All Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  // Render payment modal
  const renderPaymentModal = () => {
    if (!showPaymentModal || !selectedRecord) return null;

    const handleSubmitPayment = async (e) => {
      e.preventDefault();
      try {
        setSubmittingPayment(true);
        await handleMarkAsPaid(
          selectedRecord._id,
          paymentForm.payment_method,
          paymentForm.payment_reference,
          paymentForm.notes,
        );
        setShowPaymentModal(false);
        setSelectedRecord(null);
        setPaymentForm({
          payment_method: "bank_transfer",
          payment_reference: "",
          notes: "",
        });
      } catch (error) {
        console.error("Payment submission error:", error);
      } finally {
        setSubmittingPayment(false);
      }
    };

    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setShowPaymentModal(false);
              setSelectedRecord(null);
            }}
          />
          <div className="relative w-full max-w-md transform rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]/50 shadow-2xl transition-all z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/50">
              <h2 className="text-xl font-bold text-white">Mark as Paid</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedRecord(null);
                }}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Barber:</span>
                    <span className="text-sm font-medium text-white">
                      {selectedRecord?.barber_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Net Pay:</span>
                    <span className="text-lg font-bold text-[#FF8C42]">
                      ₱{selectedRecord?.net_pay?.toLocaleString() || "0"}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        payment_method: e.target.value,
                      }))
                    }
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                    required
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="digital_wallet">Digital Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    value={paymentForm.payment_reference}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        payment_reference: e.target.value,
                      }))
                    }
                    placeholder="Transaction ID, check number, etc."
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Additional notes about the payment..."
                    rows={3}
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedRecord(null);
                    }}
                    className="flex-1 px-4 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200"
                    disabled={submittingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="flex-1 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingPayment ? "Processing..." : "Mark as Paid"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  // Render overview
  const renderOverview = () => {
    // Show setup prompt if no payroll settings configured
    if (payrollSettingsData === undefined) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading payroll settings...</p>
        </div>
      );
    }

    if (payrollSettingsData === null || !payrollSettingsData) {
      return (
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-[#FF8C42]/20 rounded-full">
                <Settings className="h-8 w-8 text-[#FF8C42]" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Payroll Setup Required
            </h3>
            <p className="text-gray-300 mb-6 max-w-md mx-auto">
              Configure your payroll settings to start managing barber
              commissions and processing payments.
            </p>
            <button
              onClick={() => setShowSettings(true)}
              className="px-6 py-3 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 font-medium"
            >
              Configure Payroll Settings
            </button>
          </div>

          {/* Quick Setup Guide */}
          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
            <h4 className="text-lg font-semibold text-white mb-4">
              Setup Guide
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-[#FF8C42] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <span className="text-gray-300">
                  Set default commission rate (recommended: 10%)
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-[#FF8C42] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <span className="text-gray-300">
                  Choose payout frequency (weekly, bi-weekly, or monthly)
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-[#FF8C42] text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <span className="text-gray-300">
                  Configure tax rate if applicable
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <span className="text-gray-400">
                  Generate your first payroll period
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Only show loading if queries are actually undefined (still loading)
    if (
      payrollSummary === undefined ||
      barbers === undefined ||
      payrollSettingsData === undefined
    ) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading payroll data...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[#FF8C42]/20 rounded-lg">
                <Users className="h-6 w-6 text-[#FF8C42]" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-300">
                Active Barbers
              </p>
              <p className="text-2xl font-bold text-[#FF8C42]">
                {overviewStats.totalBarbers}
              </p>
              <p className="text-xs text-green-400">Ready for payroll</p>
            </div>
          </div>

          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <TrendingUp
                className={`h-4 w-4 ${overviewStats.payoutTrend === "up" ? "text-green-400" : "text-red-400"}`}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-300">
                Current Period Payout
              </p>
              <p className="text-2xl font-bold text-[#FF8C42]">
                {formatCurrency(overviewStats.currentPayout)}
              </p>
              <p
                className={`text-xs ${overviewStats.payoutTrend === "up" ? "text-green-400" : "text-red-400"}`}
              >
                {overviewStats.payoutTrend === "up" ? "+" : "-"}
                {overviewStats.payoutChange.toFixed(1)}% from last period
              </p>
            </div>
          </div>

          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-300">
                Pending Payments
              </p>
              <p className="text-2xl font-bold text-[#FF8C42]">
                {overviewStats.pendingPayments}
              </p>
              <p className="text-xs text-yellow-400">Require processing</p>
            </div>
          </div>

          <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calculator className="h-6 w-6 text-blue-400" />
              </div>
              <Check className="h-4 w-4 text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-300">
                Average Commission
              </p>
              <p className="text-2xl font-bold text-[#FF8C42]">
                {formatCurrency(overviewStats.averageCommission)}
              </p>
              <p className="text-xs text-gray-400">Per barber</p>
            </div>
          </div>
        </div>

        {/* Recent Payroll Periods */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Recent Payroll Periods
              </h3>
              <p className="text-sm text-gray-300">
                Latest payroll periods and their status
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleOpenPeriodModal}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Period</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A2A]/50">
                  <th className="text-left py-4 px-4 font-medium text-gray-300">
                    Period
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-gray-300">
                    Type
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-gray-300">
                    Status
                  </th>
                  <th className="text-right py-4 px-4 font-medium text-gray-300">
                    Total Payout
                  </th>
                  <th className="text-center py-4 px-4 font-medium text-gray-300">
                    Barbers
                  </th>
                  <th className="text-center py-4 px-4 font-medium text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(payrollSummary) ? payrollSummary : []).map(
                  (period) => (
                    <tr
                      key={period._id}
                      className="border-b border-[#2A2A2A]/20 hover:bg-[#1A1A1A]/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-white font-medium">
                            {formatDate(period.period_start)} -{" "}
                            {formatDate(period.period_end)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Created {formatDate(period.createdAt)}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-300">
                          {formatPeriodType(period.period_type)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            period.status === "paid"
                              ? "bg-green-500/20 text-green-400"
                              : period.status === "calculated"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {period.status === "paid"
                            ? "Paid"
                            : period.status === "calculated"
                              ? "Calculated"
                              : "Draft"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-[#FF8C42] font-bold">
                          {formatCurrency(period.total_commissions)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="text-sm">
                          <span className="text-green-400">
                            {period.paid_records || 0}
                          </span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-yellow-400">
                            {period.pending_records || 0}
                          </span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-white">
                            {period.total_barbers || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedPeriod(period);
                              setActiveView("period");
                            }}
                            className="px-3 py-1 bg-[#FF8C42] text-white rounded text-xs hover:bg-[#FF8C42]/90 transition-colors"
                          >
                            View Details
                          </button>
                          {period.status !== "paid" && (
                            <button
                              onClick={() => {
                                setDeleteTargetPeriod(period);
                                setDeleteConfirmText("");
                                setShowDeleteModal(true);
                              }}
                              className="px-3 py-1 bg-red-600/90 text-white rounded text-xs hover:bg-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render period details
  const renderPeriodDetails = () => {
    if (!selectedPeriod) return null;

    return (
      <div className="space-y-6">
        {/* Period Header */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Payroll Period: {formatDate(selectedPeriod.period_start)} -{" "}
                {formatDate(selectedPeriod.period_end)}
              </h3>
              <p className="text-sm text-gray-300">
                {formatPeriodType(selectedPeriod.period_type)} payroll •{" "}
                {selectedPeriod.status === "paid"
                  ? "Completed"
                  : selectedPeriod.status === "calculated"
                    ? "Ready for Payment"
                    : "Draft"}
              </p>
            </div>
            <div className="flex space-x-2">
              {selectedPeriod.status !== "paid" && (
                <button
                  onClick={() => handleCalculatePayroll(selectedPeriod)}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calculator className="h-4 w-4" />
                  <span>
                    {selectedPeriod.status === "calculated"
                      ? "Recalculate Payroll"
                      : "Calculate Payroll"}
                  </span>
                </button>
              )}
              {Array.isArray(currentPeriodRecords) &&
                currentPeriodRecords.length > 0 && (
                  <button
                    onClick={handlePrintAll}
                    className="flex items-center space-x-2 px-4 py-2 bg-[#444444]/60 border border-[#2A2A2A] text-gray-200 rounded-lg hover:bg-[#2A2A2A] transition-colors text-sm"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print All</span>
                  </button>
                )}
              <button
                onClick={() => setActiveView("overview")}
                className="px-4 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200 text-sm"
              >
                Back to Overview
              </button>
            </div>
          </div>

          {/* Period Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-[#FF8C42]" />
                <span className="text-sm text-gray-300">Total Earnings</span>
              </div>
              <p className="text-lg font-bold text-white">
                {formatCurrency(selectedPeriod.total_earnings)}
              </p>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Percent className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-300">Commissions</span>
              </div>
              <p className="text-lg font-bold text-white">
                {formatCurrency(selectedPeriod.total_commissions)}
              </p>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calculator className="h-4 w-4 text-red-400" />
                <span className="text-sm text-gray-300">Deductions</span>
              </div>
              <p className="text-lg font-bold text-white">
                {formatCurrency(selectedPeriod.total_deductions)}
              </p>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-300">Barbers</span>
              </div>
              <p className="text-lg font-bold text-white">
                {
                  (Array.isArray(currentPeriodRecords)
                    ? currentPeriodRecords
                    : []
                  ).length
                }
              </p>
            </div>
          </div>
        </div>

        {/* Payroll Records */}
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Barber Payroll Records
              </h3>
              <p className="text-sm text-gray-300">
                Individual commission calculations and payment status
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {(Array.isArray(currentPeriodRecords)
              ? currentPeriodRecords
              : []
            ).map((record) => (
              <div
                key={record._id}
                className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="text-white font-medium">
                          {record.barber_name}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {record.total_services} services
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#FF8C42]">
                          {formatCurrency(record.net_pay)}
                        </p>
                        <p className="text-sm text-gray-400">Net Pay</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.status === "paid"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {record.status === "paid" ? "Paid" : "Pending"}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowBookingsModal(true);
                          }}
                          className="px-3 py-1 bg-[#444444]/60 border border-[#2A2A2A] text-gray-200 rounded text-xs hover:bg-[#2A2A2A] transition-colors"
                        >
                          View Bookings
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowProductsModal(true);
                          }}
                          className="px-3 py-1 bg-[#444444]/60 border border-[#2A2A2A] text-gray-200 rounded text-xs hover:bg-[#2A2A2A] transition-colors"
                        >
                          View Products
                        </button>
                        <button
                          onClick={() => toggleRecordExpansion(record._id)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          {expandedRecords.has(record._id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {record.status === "calculated" && (
                          <button
                            onClick={() => {
                              setSelectedRecord(record);
                              setPaymentForm({
                                payment_method: "bank_transfer",
                                payment_reference: "",
                                notes: "",
                              });
                              setShowPaymentModal(true);
                            }}
                            className="px-3 py-1 bg-[#FF8C42] text-white rounded text-xs hover:bg-[#FF8C42]/90 transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintRecord(record)}
                          className="px-3 py-1 bg-[#444444]/60 border border-[#2A2A2A] text-gray-200 rounded text-xs hover:bg-[#2A2A2A] transition-colors"
                        >
                          Print
                        </button>
                      </div>
                    </div>
                  </div>

                  {expandedRecords.has(record._id) && (
                    <div className="mt-4 pt-4 border-t border-[#2A2A2A]/50">
                      {/* Detailed Breakdown */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                        {/* Service Earnings Breakdown */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                            <DollarSign className="w-4 h-4 mr-2 text-[#FF8C42]" />
                            Service Earnings
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Total Services:
                              </span>
                              <span className="text-white font-medium">
                                {record.total_services}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Service Revenue:
                              </span>
                              <span className="text-white">
                                {formatCurrency(record.total_service_revenue)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Service Commission:
                              </span>
                              <span className="text-[#FF8C42] font-medium">
                                {formatCurrency(record.service_commission || (record.total_service_revenue * (record.commission_rate || 0) / 100))}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Avg per Service:
                              </span>
                              <span className="text-gray-300">
                                {record.total_services > 0
                                  ? formatCurrency(
                                      record.total_service_revenue /
                                        record.total_services,
                                    )
                                  : "₱0"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Product Earnings Breakdown */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                            <DollarSign className="w-4 h-4 mr-2 text-cyan-400" />
                            Product Earnings
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Total Products:
                              </span>
                              <span className="text-white font-medium">
                                {record.total_products || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Product Revenue:
                              </span>
                              <span className="text-white">
                                {formatCurrency(record.total_product_revenue || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Product Commission:
                              </span>
                              <span className="text-cyan-400 font-medium">
                                {formatCurrency(record.product_commission || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Avg per Product:
                              </span>
                              <span className="text-gray-300">
                                {record.total_products > 0
                                  ? formatCurrency(
                                      record.total_product_revenue /
                                        record.total_products,
                                    )
                                  : "₱0"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Daily Rate & Calculation */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-blue-400" />
                            Daily Rate & Calculation
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Daily Rate:</span>
                              <span className="text-white">
                                {formatCurrency(record.daily_rate || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Days Worked:
                              </span>
                              <span className="text-white">
                                {record.days_worked || 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Total Sales:
                              </span>
                              <span className="text-white">
                                {formatCurrency(record.total_service_revenue)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Final Summary */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
                            Final Summary
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Gross Commission (ref):
                              </span>
                              <span className="text-white">
                                {formatCurrency(record.gross_commission)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Final Daily Salary:
                              </span>
                              <span className="text-white font-medium">
                                {formatCurrency(record.daily_pay || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Tax Rate:</span>
                              <span className="text-gray-300">
                                {record.tax_deduction > 0
                                  ? `${((record.tax_deduction / (record.daily_pay || 1)) * 100).toFixed(1)}%`
                                  : "0%"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Tax Deduction:
                              </span>
                              <span className="text-red-400">
                                -{formatCurrency(record.tax_deduction)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">
                                Other Deductions:
                              </span>
                              <span className="text-red-400">
                                -{formatCurrency(record.other_deductions)}
                              </span>
                            </div>
                            <div className="flex justify-between font-medium pt-2 border-t border-[#2A2A2A]/50">
                              <span className="text-white">Net Pay:</span>
                              <span className="text-[#FF8C42] text-lg">
                                {formatCurrency(record.net_pay)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="mt-6 pt-4 border-t border-[#2A2A2A]/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Performance Metrics */}
                          <div>
                            <h6 className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">
                              Performance Metrics
                            </h6>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">
                                  Services per Day:
                                </span>
                                <span className="text-white">
                                  {record.days_worked > 0
                                    ? (
                                        record.total_services /
                                        record.days_worked
                                      ).toFixed(1)
                                    : "0"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">
                                  Revenue per Day:
                                </span>
                                <span className="text-white">
                                  {record.days_worked > 0
                                    ? formatCurrency(
                                        record.total_service_revenue /
                                          record.days_worked,
                                      )
                                    : "₱0"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">
                                  Commission per Day:
                                </span>
                                <span className="text-white">
                                  {record.days_worked > 0
                                    ? formatCurrency(
                                        record.gross_commission /
                                          record.days_worked,
                                      )
                                    : "₱0"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Information */}
                      {record.status === "paid" && record.paid_at && (
                        <div className="mt-6 pt-4 border-t border-[#2A2A2A]/50">
                          <h6 className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">
                            Payment Information
                          </h6>
                          <div className="flex items-center space-x-6 text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400">Paid on:</span>
                              <span className="text-white">
                                {formatDate(record.paid_at)}
                              </span>
                            </div>
                            {record.payment_method && (
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-400">Method:</span>
                                <span className="text-white capitalize">
                                  {record.payment_method.replace("_", " ")}
                                </span>
                              </div>
                            )}
                            {record.payment_reference && (
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-400">
                                  Reference:
                                </span>
                                <span className="text-white font-mono text-xs">
                                  {record.payment_reference}
                                </span>
                              </div>
                            )}
                          </div>
                          {record.notes && (
                            <div className="mt-2">
                              <span className="text-gray-400 text-sm">
                                Notes:{" "}
                              </span>
                              <span className="text-gray-300 text-sm">
                                {record.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Delete Period Modal
  const renderDeleteModal = () =>
    showDeleteModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md bg-[#1F1F1F] border border-[#2A2A2A]/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            Delete Payroll Period
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            This will permanently delete the selected payroll period and all its
            payroll records and adjustments. This action cannot be undone.
          </p>
          <p className="text-sm text-gray-400 mb-3">
            Type{" "}
            <span className="text-red-400 font-semibold">
              confirm delete record
            </span>{" "}
            to proceed.
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="confirm delete record"
            className="w-full h-11 px-4 bg-[#121212] border border-[#2A2A2A]/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-sm bg-[#333] text-gray-200 rounded-lg hover:bg-[#2A2A2A]"
            >
              Cancel
            </button>
            <button
              disabled={
                deleteConfirmText.trim().toLowerCase() !==
                "confirm delete record"
              }
              onClick={async () => {
                if (!deleteTargetPeriod) return;
                try {
                  setLoading(true);
                  await deletePayrollPeriodMutation({
                    payroll_period_id: deleteTargetPeriod._id,
                  });
                  setShowDeleteModal(false);
                  setDeleteTargetPeriod(null);
                } catch (err) {
                  console.error("Delete period error:", err);
                  setError("Failed to delete payroll period");
                } finally {
                  setLoading(false);
                }
              }}
              className={`px-4 py-2 text-sm rounded-lg ${deleteConfirmText.trim().toLowerCase() === "confirm delete record" ? "bg-red-600 text-white hover:bg-red-700" : "bg-red-900/40 text-red-300/60 cursor-not-allowed"}`}
            >
              Delete Period
            </button>
          </div>
        </div>
      </div>
    );

  // Main render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">Payroll Management</h2>
          <p className="text-gray-300 mt-1">
            Manage barber commissions and payroll processing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200 text-sm"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden xl:inline">Settings</span>
          </button>

          <div className="h-6 w-px bg-[#2A2A2A]" />

          <button
            onClick={() => setShowServiceRatesModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200 text-sm"
            title="Service Commission Rates"
          >
            <Percent className="h-4 w-4" />
            <span className="hidden xl:inline">Service</span>
          </button>

          <button
            onClick={() => setShowProductRatesModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200 text-sm"
            title="Product Commission Rates"
          >
            <Percent className="h-4 w-4" />
            <span className="hidden xl:inline">Product</span>
          </button>

          <button
            onClick={() => setShowDailyRatesModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200 text-sm"
            title="Daily Rates"
          >
            <DollarSign className="h-4 w-4" />
            <span className="hidden xl:inline">Daily</span>
          </button>

          <div className="h-6 w-px bg-[#2A2A2A]" />

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#444444]/50 border border-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden xl:inline">{loading ? "Loading..." : "Refresh"}</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 text-sm font-medium shadow-lg shadow-[#FF8C42]/20"
            title="Export to CSV"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* View Navigation */}
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveView("overview")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeView === "overview"
                ? "bg-[#FF8C42] text-white"
                : "text-gray-300 hover:text-white hover:bg-[#1A1A1A]"
            }`}
          >
            Overview
          </button>
          {selectedPeriod && (
            <button
              onClick={() => setActiveView("period")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeView === "period"
                  ? "bg-[#FF8C42] text-white"
                  : "text-gray-300 hover:text-white hover:bg-[#1A1A1A]"
              }`}
            >
              Period Details
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {activeView === "overview" ? renderOverview() : renderPeriodDetails()}

      {/* Modals */}
      {renderPeriodModal()}
      {renderSettingsModal()}
      {renderPaymentModal()}
      {renderServiceRatesModal()}
      {renderProductRatesModal()}
      {renderDailyRatesModal()}
      {renderBookingsModal()}
      {renderProductsModal()}
      {renderDeleteModal()}

      {/* Recalculate Confirmation Modal */}
      <AlertModal
        isOpen={showRecalculateConfirm}
        type="confirm"
        accent="brand"
        title="Recalculate Payroll?"
        message="Recalculating will replace existing payroll records for this period. Continue?"
        confirmText="Recalculate"
        cancelText="Cancel"
        onConfirm={handleRecalculateConfirm}
        onClose={() => {
          setShowRecalculateConfirm(false);
          setRecalculatePeriod(null);
        }}
      />
    </div>
  );
};

export default PayrollManagement;
