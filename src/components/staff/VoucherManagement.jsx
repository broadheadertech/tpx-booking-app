import React, { useState, useRef, useEffect } from "react";
import {
  Gift,
  Calendar,
  User,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Plus,
  RotateCcw,
  QrCode,
  Download,
  Printer,
  Copy,
  Mail,
  Trash2,
  Edit,
  Users,
  Grid,
  List,
  AlertCircle,
} from "lucide-react";
import QRCode from "qrcode";
import Modal from "../common/Modal";
import SendVoucherModal from "./SendVoucherModal";
import ViewVoucherUsersModal from "./ViewVoucherUsersModal";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useBranding } from "../../context/BrandingContext";

const VoucherManagement = ({ vouchers = [], onRefresh, onCreateVoucher }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [showQRCode, setShowQRCode] = useState(null);
  const [showSendModal, setShowSendModal] = useState(null);
  const [showUsersModal, setShowUsersModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'card' or 'table' - DEFAULT TABLE
  const { branding } = useBranding();

  // Modal states
  const [confirmModal, setConfirmModal] = useState(null);
  const [errorModal, setErrorModal] = useState(null);

  // Convex queries and mutations
  const deleteVoucher = useMutation(api.services.vouchers.deleteVoucher);
  const assignedUsers = useQuery(
    api.services.vouchers.getVoucherAssignedUsers,
    showUsersModal ? { voucherId: showUsersModal._id } : "skip"
  );

  const getStatusConfig = (voucher) => {
    if (voucher.redeemed) {
      return {
        status: "redeemed",
        label: "Redeemed",
        icon: CheckCircle,
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        iconColor: "text-green-500",
      };
    }
    const isExpired = voucher.expires_at < Date.now();
    if (isExpired) {
      return {
        status: "expired",
        label: "Expired",
        icon: XCircle,
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        iconColor: "text-red-500",
      };
    }
    return {
      status: "active",
      label: "Active",
      icon: Clock,
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      iconColor: "text-orange-500",
    };
  };

  const handleDelete = async (voucher) => {
    setConfirmModal({
      title: "Delete Voucher",
      message: `Are you sure you want to delete voucher "${voucher.code}"?`,
      type: "delete",
      onConfirm: async () => {
        setConfirmModal(null);
        setLoading(true);
        try {
          await deleteVoucher({ id: voucher._id });
          onRefresh();
        } catch (err) {
          console.error("Failed to delete voucher:", err);
          setErrorModal({
            title: "Delete Failed",
            message: "Failed to delete voucher. Please try again.",
          });
        } finally {
          setLoading(false);
        }
      },
      onCancel: () => {
        setConfirmModal(null);
      },
    });
  };

  const filteredVouchers = vouchers
    .filter((voucher) => {
      const matchesSearch = voucher.code
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesFilter =
        filterStatus === "all" ||
        getStatusConfig(voucher).status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "value") return parseFloat(b.value) - parseFloat(a.value);
      if (sortBy === "expires_at")
        return new Date(a.expires_at) - new Date(b.expires_at);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const stats = {
    total: vouchers.length,
    active: vouchers.filter((v) => !v.redeemed && !v.isExpired).length,
    redeemed: vouchers.filter((v) => v.redeemed).length,
    expired: vouchers.filter((v) => v.isExpired && !v.redeemed).length,
    totalValue: vouchers.reduce((sum, v) => sum + parseFloat(v.value), 0),
  };

  // Mini QR Code for card thumbnail
  const MiniQRCode = ({ voucher }) => {
    const qrRef = useRef(null);
    const qrData = JSON.stringify({
      voucherId: voucher.id,
      code: voucher.code,
      type: "voucher",
      brand: branding?.display_name,
    });

    useEffect(() => {
      if (qrRef.current) {
        QRCode.toCanvas(
          qrRef.current,
          qrData,
          {
            width: 32,
            margin: 0,
            color: { dark: "#36454F", light: "#ffffff" },
            errorCorrectionLevel: "M",
          },
          (err) => {
            if (err) console.error("Mini QR error:", err);
          }
        );
      }
    }, [qrData]);

    return (
      <canvas
        ref={qrRef}
        className="rounded w-8 h-8"
        style={{ maxWidth: "32px", maxHeight: "32px" }}
      />
    );
  };

  // QR Code Modal for full-size display
  const QRCodeModal = ({ voucher, onClose }) => {
    const qrCanvasRef = useRef(null);

    const qrPayload = JSON.stringify({
      voucherId: voucher.id,
      code: voucher.code,
      value: voucher.value,
      expires_at: voucher.expires_at,
      user: voucher.user,
      redeemed: !!voucher.redeemed,
      type: "voucher",
      brand: branding?.display_name,
    });

    useEffect(() => {
      if (qrCanvasRef.current) {
        QRCode.toCanvas(
          qrCanvasRef.current,
          qrPayload,
          {
            width: 220,
            margin: 2,
            color: { dark: "#FF8C42", light: "#1A1A1A" },
            errorCorrectionLevel: "H",
          },
          (err) => {
            if (err) console.error("QR generation error:", err);
          }
        );
      }
    }, [qrPayload]);

    const handleDownload = async () => {
      try {
        const url = await QRCode.toDataURL(qrPayload, {
          width: 600,
          margin: 2,
          color: { dark: "#FF8C42", light: "#1A1A1A" },
          errorCorrectionLevel: "H",
        });
        const link = document.createElement("a");
        link.href = url;
        link.download = `voucher-${voucher.code}.png`;
        link.click();
      } catch (e) {
        console.error("Failed to download QR:", e);
      }
    };

    const handlePrint = async () => {
      try {
        const url = await QRCode.toDataURL(qrPayload, {
          width: 600,
          margin: 2,
          color: { dark: "#FF8C42", light: "#ffffff" },
          errorCorrectionLevel: "H",
        });
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        printWindow.document.write(`
          <html>
            <head>
              <title>Voucher ${voucher.code} - QR</title>
              <style>
                body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; text-align: center; padding: 24px; }
                .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; color: #F68B24; }
              </style>
            </head>
            <body>
              <h2>Voucher <span class="code">${voucher.code}</span></h2>
              <img src="${url}" alt="Voucher QR" style="width: 320px; height: 320px;" />
              <p>Present this QR at the counter to redeem.</p>
              <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } catch (e) {
        console.error("Failed to print QR:", e);
      }
    };

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(voucher.code);
      } catch (e) {
        console.error("Failed to copy code:", e);
      }
    };

    const status = getStatusConfig(voucher);

    return (
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Voucher QR Code"
        size="sm"
        variant="dark"
        compact
      >
        <div className="text-center space-y-4 p-2">
          {/* Title & Code */}
          <div>
            <p className="text-3xl font-mono font-bold text-[var(--color-primary)] tracking-wider">
              {voucher.code}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Scan to validate or redeem
            </p>
          </div>

          {/* QR Code Container */}
          <div className="p-4 rounded-xl bg-[#0F0F0F]/50 border border-[var(--color-primary)]/20 inline-block shadow-lg">
            <div className="flex justify-center">
              <canvas ref={qrCanvasRef} className="rounded" />
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#0F0F0F]/50 border border-[#333333]/50">
              <div className="text-gray-400 mb-1 uppercase tracking-wider text-[10px]">
                Value
              </div>
              <div className="font-bold text-lg text-[var(--color-primary)]">
                ₱{parseFloat(voucher.value).toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#0F0F0F]/50 border border-[#333333]/50">
              <div className="text-gray-400 mb-1 uppercase tracking-wider text-[10px]">
                Status
              </div>
              <div className="font-bold text-white text-base inline-flex items-center gap-1">
                <span
                  className={
                    status.label === "Active"
                      ? "text-green-400"
                      : status.label === "Redeemed"
                        ? "text-blue-400"
                        : "text-red-400"
                  }
                >
                  {status.label}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#0F0F0F]/50 border border-[#333333]/50">
              <div className="text-gray-400 mb-1 uppercase tracking-wider text-[10px]">
                Expires
              </div>
              <div
                className={`font-bold text-sm ${voucher.isExpired ? "text-red-400" : "text-gray-300"}`}
              >
                {new Date(voucher.expires_at).toLocaleDateString()}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#0F0F0F]/50 border border-[#333333]/50">
              <div className="text-gray-400 mb-1 uppercase tracking-wider text-[10px]">
                Points
              </div>
              <div className="font-bold text-white text-sm">
                {voucher.points_required}
              </div>
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="w-full px-4 py-3 bg-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#333333] transition-colors text-sm font-medium flex items-center justify-center gap-2 border border-[#333333]"
          >
            <Copy className="w-4 h-4" /> Copy Code
          </button>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-10 bg-[#2A2A2A] text-gray-300 rounded-xl hover:bg-[#333333] transition-colors text-sm font-medium"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 h-10 bg-[#444444] text-gray-300 rounded-xl hover:bg-[#555555] transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 h-10 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Total</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">
                {stats.total}
              </p>
            </div>
            <Gift className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Active</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">
                {stats.active}
              </p>
            </div>
            <Clock className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Redeemed</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">
                {stats.redeemed}
              </p>
            </div>
            <CheckCircle className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Expired</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">
                {stats.expired}
              </p>
            </div>
            <XCircle className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Total Value</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">
                ₱{stats.totalValue.toFixed(0)}
              </p>
            </div>
            <DollarSign className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search voucher code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white placeholder-gray-500 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] text-sm"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="redeemed">Redeemed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
            >
              <option value="created_at">Sort by Date</option>
              <option value="value">Sort by Value</option>
              <option value="expires_at">Sort by Expiry</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#1A1A1A] rounded-lg border border-[#444444] p-1">
              <button
                onClick={() => setViewMode("card")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "card"
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={onRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-[#444444] text-gray-300 rounded-lg hover:bg-[#555555] transition-colors text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={onCreateVoucher}
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Voucher</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vouchers Display */}
      {viewMode === "card" ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVouchers.map((voucher) => {
            const statusConfig = getStatusConfig(voucher);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={voucher._id}
                className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm hover:shadow-lg transition-all duration-200 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center w-12 h-12">
                      <MiniQRCode voucher={voucher} />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold text-white">
                        {voucher.code}
                      </p>
                      <p className="text-xs text-gray-400">
                        Points: {voucher.points_required}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
                        statusConfig.status === "active"
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : statusConfig.status === "redeemed"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      <span className="text-xs font-medium">
                        {statusConfig.label}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(voucher)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#444444] rounded transition-colors"
                      title="Delete Voucher"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Value</span>
                    <span className="text-lg font-bold text-[var(--color-primary)]">
                      ₱{parseFloat(voucher.value).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      Points Required
                    </span>
                    <span className="text-sm font-medium text-white">
                      {voucher.points_required}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Assignments</span>
                    <span className="text-sm font-medium text-white">
                      {voucher.assignedCount || 0}/{voucher.max_uses}
                      {voucher.redeemedCount > 0 && (
                        <span className="text-green-400 ml-1">
                          ({voucher.redeemedCount} redeemed)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Created</span>
                    <span className="text-sm text-gray-300">
                      {new Date(voucher.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Expires</span>
                    <span
                      className={`text-sm ${voucher.expires_at < Date.now() ? "text-red-400" : "text-gray-300"}`}
                    >
                      {new Date(voucher.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#444444]/30">
                  {/* Always show View Users button */}
                  <button
                    onClick={() => setShowUsersModal(voucher)}
                    className="w-full mb-2 px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium flex items-center justify-center"
                  >
                    <Users className="h-4 w-4 mr-2" /> View Assigned Users
                  </button>

                  {/* Show action buttons only for active vouchers */}
                  {!voucher.redeemed && voucher.expires_at >= Date.now() && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowQRCode(voucher)}
                        className="flex-1 px-3 py-2 bg-[#444444] text-gray-300 rounded-lg hover:bg-[#555555] transition-colors text-sm font-medium flex items-center justify-center"
                      >
                        <QrCode className="h-4 w-4 mr-2" /> View QR
                      </button>
                      <button
                        onClick={() => setShowSendModal(voucher)}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:from-[var(--color-accent)] hover:brightness-110 transition-colors text-sm font-semibold flex items-center justify-center"
                      >
                        <Mail className="h-4 w-4 mr-2" /> Send Email
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#444444]/30">
              <thead className="bg-[#0A0A0A]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Voucher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#444444]/30">
                {filteredVouchers.map((voucher) => {
                  const statusConfig = getStatusConfig(voucher);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr
                      key={voucher._id}
                      className="hover:bg-[#333333]/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg mr-3">
                            <Gift className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-mono font-bold text-white">
                              {voucher.code}
                            </div>
                            <div className="text-sm text-gray-400">
                              Created:{" "}
                              {new Date(voucher.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-[var(--color-primary)]">
                          ₱{parseFloat(voucher.value).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {voucher.points_required}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {voucher.assignedCount || 0}/{voucher.max_uses}
                          {voucher.redeemedCount > 0 && (
                            <div className="text-xs text-green-400">
                              ({voucher.redeemedCount} redeemed)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`flex items-center space-x-1 px-2 py-1 rounded-full w-fit ${
                            statusConfig.status === "active"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : statusConfig.status === "redeemed"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          <span className="text-xs font-medium">
                            {statusConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm ${voucher.expires_at < Date.now() ? "text-red-400" : "text-gray-300"}`}
                        >
                          {new Date(voucher.expires_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setShowUsersModal(voucher)}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-[#444444] rounded-lg transition-colors"
                            title="View Users"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          {!voucher.redeemed &&
                            voucher.expires_at >= Date.now() && (
                              <>
                                <button
                                  onClick={() => setShowQRCode(voucher)}
                                  className="p-2 text-gray-400 hover:text-[var(--color-primary)] hover:bg-[#444444] rounded-lg transition-colors"
                                  title="View QR"
                                >
                                  <QrCode className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setShowSendModal(voucher)}
                                  className="p-2 text-gray-400 hover:text-[var(--color-primary)] hover:bg-[#444444] rounded-lg transition-colors"
                                  title="Send Email"
                                >
                                  <Mail className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          <button
                            onClick={() => handleDelete(voucher)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-[#444444] rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredVouchers.length === 0 && (
        <div className="text-center py-12">
          <Gift className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">
            No vouchers found
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {searchTerm || filterStatus !== "all"
              ? "Try adjusting your search or filter criteria."
              : "Get started by creating a new voucher."}
          </p>
        </div>
      )}

      {showQRCode && (
        <QRCodeModal voucher={showQRCode} onClose={() => setShowQRCode(null)} />
      )}

      {showSendModal && (
        <SendVoucherModal
          voucher={showSendModal}
          isOpen={!!showSendModal}
          onClose={() => setShowSendModal(null)}
        />
      )}

      {showUsersModal && (
        <ViewVoucherUsersModal
          voucher={showUsersModal}
          isOpen={!!showUsersModal}
          onClose={() => setShowUsersModal(null)}
          assignedUsers={assignedUsers || []}
        />
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.title || "Confirm"}
        size="sm"
        variant="dark"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-sm text-gray-300">{confirmModal?.message}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmModal(null)}
              className="flex-1 px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-gray-300 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={confirmModal?.onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                confirmModal?.type === "delete"
                  ? "bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  : "bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white disabled:opacity-50"
              }`}
            >
              {loading ? "Processing..." : "Confirm"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal
        isOpen={!!errorModal}
        onClose={() => setErrorModal(null)}
        title={errorModal?.title || "Error"}
        size="sm"
        variant="dark"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm text-gray-300">{errorModal?.message}</p>
          </div>
          <button
            onClick={() => setErrorModal(null)}
            className="w-full px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white rounded-lg transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default VoucherManagement;
