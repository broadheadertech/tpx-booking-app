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
  HelpCircle,
  Send,
} from "lucide-react";
import WalkthroughOverlay from "../common/WalkthroughOverlay";
import { branchVoucherSteps } from "../../config/walkthroughSteps";
import QRCode from "qrcode";
import Modal from "../common/Modal";
import SendVoucherModal from "./SendVoucherModal";
import ViewVoucherUsersModal from "./ViewVoucherUsersModal";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useBranding } from "../../context/BrandingContext";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import CreateVoucherModal from "../staff/CreateVoucherModal";

const VoucherManagement = ({ vouchers = [], onRefresh, onCreateVoucher }) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [showQRCode, setShowQRCode] = useState(null);
  const [showSendModal, setShowSendModal] = useState(null);
  const [showUsersModal, setShowUsersModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'card' or 'table' - DEFAULT TABLE
  const { branding } = useBranding();
  const { user } = useCurrentUser();

  // Modal states
  const [confirmModal, setConfirmModal] = useState(null);
  const [errorModal, setErrorModal] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Convex queries and mutations
  const deleteVoucher = useMutation(api.services.vouchers.deleteVoucher);
  const approveVoucherMutation = useMutation(api.services.vouchers.approveVoucher);
  const rejectVoucherMutation = useMutation(api.services.vouchers.rejectVoucher);
  const assignedUsers = useQuery(
    api.services.vouchers.getVoucherAssignedUsers,
    showUsersModal ? { voucherId: showUsersModal._id } : "skip"
  );

  // Send request queries and mutations
  const pendingSendRequests = useQuery(
    api.services.vouchers.getSendRequestsByBranch,
    user?.branch_id ? { branch_id: user.branch_id } : "skip"
  );
  const approveSendRequestMutation = useMutation(api.services.vouchers.approveSendRequest);
  const rejectSendRequestMutation = useMutation(api.services.vouchers.rejectSendRequest);
  const sendVoucherEmailAction = useAction(api.services.auth.sendVoucherEmailWithQR);
  const [sendRequestProcessing, setSendRequestProcessing] = useState(null);
  const [rejectSendModal, setRejectSendModal] = useState(null);

  const isBranchAdminOrHigher = user?.role === "branch_admin" || user?.role === "super_admin" || user?.role === "admin_staff" || user?.role === "it_admin";

  // Approve send request → assign vouchers + send emails
  const handleApproveSendRequest = async (request) => {
    setSendRequestProcessing(request._id);
    try {
      const result = await approveSendRequestMutation({
        request_id: request._id,
        approved_by: user._id,
      });

      // Send emails to assigned recipients with their unique assignment codes
      let emailsSent = 0;
      for (const recipient of result.assignedRecipients) {
        try {
          await sendVoucherEmailAction({
            email: recipient.email,
            recipientName: recipient.nickname || recipient.username,
            voucherCode: recipient.assignmentCode || result.voucher.code, // Use unique assignment code
            voucherValue: `₱${parseFloat(result.voucher.value).toFixed(2)}`,
            pointsRequired: result.voucher.points_required || 0,
            expiresAt: new Date(result.voucher.expires_at).toLocaleDateString(),
            voucherId: result.voucher._id,
          });
          emailsSent++;
        } catch (emailErr) {
          console.error(`Failed to send email to ${recipient.email}:`, emailErr);
        }
      }

      onRefresh();
      setConfirmModal(null);
      setErrorModal(emailsSent > 0
        ? null
        : { title: "Partial Success", message: `Vouchers assigned but emails failed to send. ${result.assignedRecipients.length} users were assigned.` }
      );
    } catch (error) {
      console.error("Failed to approve send request:", error);
      setErrorModal({ title: "Approval Failed", message: error.message || "Failed to approve send request." });
    } finally {
      setSendRequestProcessing(null);
    }
  };

  const handleRejectSendRequest = async () => {
    if (!rejectSendModal || !rejectSendModal.reason?.trim()) return;
    setSendRequestProcessing(rejectSendModal._id);
    try {
      await rejectSendRequestMutation({
        request_id: rejectSendModal._id,
        rejected_by: user._id,
        reason: rejectSendModal.reason,
      });
      setRejectSendModal(null);
      onRefresh();
    } catch (error) {
      console.error("Failed to reject send request:", error);
      setErrorModal({ title: "Rejection Failed", message: error.message || "Failed to reject send request." });
    } finally {
      setSendRequestProcessing(null);
    }
  };

  const handleApprove = async () => {
    if (!approveModal || !user) return;
    setProcessingId(approveModal._id);
    try {
      await approveVoucherMutation({ id: approveModal._id, approved_by: user._id });
      setApproveModal(null);
      onRefresh();
    } catch (error) {
      console.error("Failed to approve voucher:", error);
      setErrorModal({ title: "Approval Failed", message: error.message || "Failed to approve voucher." });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !user || !rejectModal.reason?.trim()) return;
    setProcessingId(rejectModal._id);
    try {
      await rejectVoucherMutation({ id: rejectModal._id, rejected_by: user._id, reason: rejectModal.reason });
      setRejectModal(null);
      onRefresh();
    } catch (error) {
      console.error("Failed to reject voucher:", error);
      setErrorModal({ title: "Rejection Failed", message: error.message || "Failed to reject voucher." });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusConfig = (voucher) => {
    if (voucher.status === "pending_approval") {
      return {
        status: "pending_approval",
        label: "Pending Approval",
        icon: Clock,
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
        iconColor: "text-yellow-500",
      };
    }
    if (voucher.status === "rejected") {
      return {
        status: "rejected",
        label: "Rejected",
        icon: XCircle,
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        iconColor: "text-red-500",
      };
    }
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
      icon: CheckCircle, // Changed icon for active
      bg: "bg-green-50", // Changed color for active to distinguish from pending
      text: "text-green-700",
      border: "border-green-200",
      iconColor: "text-green-500",
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
          await deleteVoucher({ id: voucher._id, user_id: user._id });
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
      <div data-tour="vouch-stats" className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

      {/* Pending Send Requests — visible to branch_admin+ */}
      {isBranchAdminOrHigher && pendingSendRequests && pendingSendRequests.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-lg border border-yellow-500/30 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-yellow-400" />
              <h3 className="text-sm font-bold text-yellow-400">Pending Send Requests</h3>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">
                {pendingSendRequests.length}
              </span>
            </div>
          </div>
          <div className="divide-y divide-[#333333]/50">
            {pendingSendRequests.map((request) => (
              <div key={request._id} className="p-4 hover:bg-[#222222]/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono font-bold text-[var(--color-primary)]">
                        {request.voucher?.code || "—"}
                      </span>
                      <span className="text-xs text-gray-500">
                        ₱{request.voucher ? parseFloat(request.voucher.value).toFixed(2) : "0"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      Requested by <span className="text-white">{request.requester?.username || "Unknown"}</span>
                      {" · "}{new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {request.recipients.map((r) => (
                        <span
                          key={r._id}
                          className="text-xs bg-[#2A2A2A] text-gray-300 px-2 py-0.5 rounded border border-[#444444]/50"
                        >
                          {r.username} ({r.email})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setRejectSendModal({ _id: request._id, code: request.voucher?.code, reason: "" })}
                      disabled={sendRequestProcessing === request._id}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Reject"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleApproveSendRequest(request)}
                      disabled={sendRequestProcessing === request._id}
                      className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-xs font-medium border border-green-500/30 disabled:opacity-50 flex items-center gap-1"
                    >
                      {sendRequestProcessing === request._id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-transparent border-t-green-400"></div>
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      Approve & Send
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div data-tour="vouch-controls" className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
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
                <option value="pending_approval">Pending Approval</option>
                <option value="rejected">Rejected</option>
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
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Voucher</span>
            </button>
            <button onClick={() => setShowTutorial(true)} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#2A2A2A] transition-colors" title="Show tutorial">
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Vouchers Display */}
      <div data-tour="vouch-list">
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
                          : statusConfig.status === "pending_approval"
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : statusConfig.status === "rejected"
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
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
                    {(user?.role === "branch_admin" ||
                      user?.role === "super_admin") && (
                      <button
                        onClick={() => handleDelete(voucher)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#444444] rounded transition-colors"
                        title="Delete Voucher"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {voucher.status === "rejected" && voucher.rejection_reason && (
                  <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300">
                    <strong>Rejection Reason:</strong>{" "}
                    {voucher.rejection_reason}
                  </div>
                )}

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
                    disabled={voucher.status !== "active"}
                    className={`w-full mb-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium flex items-center justify-center ${
                      voucher.status === "active"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                        : "bg-gray-500/10 text-gray-500 border-gray-500/20 cursor-not-allowed"
                    }`}
                  >
                    <Users className="h-4 w-4 mr-2" /> View Assigned Users
                  </button>

                  {/* Show action buttons only for active vouchers */}
                  {!voucher.redeemed &&
                    voucher.expires_at >= Date.now() &&
                    voucher.status === "active" && (
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
                  {voucher.status === "pending_approval" && (
                    isBranchAdminOrHigher ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setRejectModal({ _id: voucher._id, code: voucher.code, reason: "" })}
                          disabled={processingId === voucher._id}
                          className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium flex items-center justify-center border border-red-500/30 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </button>
                        <button
                          onClick={() => setApproveModal(voucher)}
                          disabled={processingId === voucher._id}
                          className="flex-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm font-medium flex items-center justify-center border border-green-500/30 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-xs text-yellow-500 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        Waiting for Admin Approval
                      </div>
                    )
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
                              : statusConfig.status === "pending_approval"
                                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                : statusConfig.status === "rejected"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
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
                        {voucher.status === "rejected" &&
                          voucher.rejection_reason && (
                            <div
                              className="text-[10px] text-red-400 mt-1 truncate max-w-[150px]"
                              title={voucher.rejection_reason}
                            >
                              {voucher.rejection_reason}
                            </div>
                          )}
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
                            disabled={voucher.status !== "active"}
                            className={`p-2 rounded-lg transition-colors ${
                              voucher.status === "active"
                                ? "text-gray-400 hover:text-blue-400 hover:bg-[#444444]"
                                : "text-gray-600 cursor-not-allowed"
                            }`}
                            title="View Users"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          {!voucher.redeemed &&
                            voucher.expires_at >= Date.now() &&
                            voucher.status === "active" && (
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
                          {voucher.status === "pending_approval" && isBranchAdminOrHigher && (
                            <>
                              <button
                                onClick={() => setRejectModal({ _id: voucher._id, code: voucher.code, reason: "" })}
                                disabled={processingId === voucher._id}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setApproveModal(voucher)}
                                disabled={processingId === voucher._id}
                                className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {(user?.role === "branch_admin" ||
                            user?.role === "super_admin") && (
                            <button
                              onClick={() => handleDelete(voucher)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-[#444444] rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
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
      </div>

       {showCreateModal && (
            <CreateVoucherModal
              isOpen={showCreateModal}
              onClose={() => {
                setShowCreateModal(false);
                onRefresh();
              }}
              onSubmit={() => {
                onRefresh();
              }}
              onSendNow={(voucher) => {
                setShowCreateModal(false);
                onRefresh();
                setShowSendModal(voucher);
              }}
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

      {/* Approve Voucher Modal */}
      <Modal
        isOpen={!!approveModal}
        onClose={() => setApproveModal(null)}
        title="Approve Voucher"
        size="sm"
        variant="dark"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-300">
                Approve voucher <span className="font-mono font-bold text-white">{approveModal?.code}</span>?
              </p>
              <p className="text-xs text-gray-500 mt-1">This will make the voucher active and available for use.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setApproveModal(null)}
              className="flex-1 px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-gray-300 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={!!processingId}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              {processingId ? "Approving..." : "Approve"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Voucher Modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="Reject Voucher"
        size="sm"
        variant="dark"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm text-gray-300">
              Reject voucher <span className="font-mono font-bold text-white">{rejectModal?.code}</span>?
            </p>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Reason for rejection *</label>
            <textarea
              value={rejectModal?.reason || ""}
              onChange={(e) => setRejectModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
              placeholder="Enter reason for rejection..."
              rows={3}
              className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setRejectModal(null)}
              className="flex-1 px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-gray-300 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={!!processingId || !rejectModal?.reason?.trim()}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              {processingId ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Send Request Modal */}
      <Modal
        isOpen={!!rejectSendModal}
        onClose={() => setRejectSendModal(null)}
        title="Reject Send Request"
        size="sm"
        variant="dark"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm text-gray-300">
              Reject send request for voucher <span className="font-mono font-bold text-white">{rejectSendModal?.code}</span>?
            </p>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Reason for rejection *</label>
            <textarea
              value={rejectSendModal?.reason || ""}
              onChange={(e) => setRejectSendModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
              placeholder="Enter reason for rejection..."
              rows={3}
              className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setRejectSendModal(null)}
              className="flex-1 px-4 py-2 bg-[#2A2A2A] hover:bg-[#333333] text-gray-300 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectSendRequest}
              disabled={!!sendRequestProcessing || !rejectSendModal?.reason?.trim()}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              {sendRequestProcessing ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </div>
      </Modal>

      <WalkthroughOverlay steps={branchVoucherSteps} isVisible={showTutorial} onComplete={() => setShowTutorial(false)} onSkip={() => setShowTutorial(false)} />
    </div>
  );
};

export default VoucherManagement;
