import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
    CheckCircle,
    XCircle,
    Clock,
    Filter,
    Search,
    AlertCircle,
    ChevronDown,
    ShieldCheck,
    ShieldAlert,
} from "lucide-react";
import Modal from "../common/Modal";
import { useAuth } from "../../context/AuthContext";

const AdminVoucherManagement = () => {
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const [filterStatus, setFilterStatus] = useState("pending_approval");
    const [searchTerm, setSearchTerm] = useState("");
    const [rejectModal, setRejectModal] = useState(null);
    const [approveModal, setApproveModal] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const { user } = useAuth();

    // Queries
    const branches = useQuery(api.services.branches.getAllBranches) || [];
    const vouchers = useQuery(
        api.services.vouchers.getVouchersByBranch,
        selectedBranchId ? { branch_id: selectedBranchId } : "skip"
    );

    // Mutations
    const approveVoucher = useMutation(api.services.vouchers.approveVoucher);
    const rejectVoucher = useMutation(api.services.vouchers.rejectVoucher);

    // Set default branch
    React.useEffect(() => {
        if (branches.length > 0 && !selectedBranchId) {
            setSelectedBranchId(branches[0]._id);
        }
    }, [branches, selectedBranchId]);

    const handleApproveClick = (voucher) => {
        setApproveModal(voucher);
    };

    const confirmApprove = async () => {
        if (!approveModal || !user) return;
        setProcessingId(approveModal._id);
        try {
            await approveVoucher({
                id: approveModal._id,
                approved_by: user._id
            });
            setApproveModal(null);
        } catch (error) {
            console.error("Failed to approve voucher:", error);
            // Ideally show a toast notification here
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectModal || !user) return;
        setProcessingId(rejectModal.id);
        try {
            await rejectVoucher({
                id: rejectModal.id,
                rejected_by: user._id,
                reason: rejectModal.reason,
            });
            setRejectModal(null);
        } catch (error) {
            console.error("Failed to reject voucher:", error);
        } finally {
            setProcessingId(null);
        }
    };

    // Filter vouchers
    const filteredVouchers = (vouchers || [])
        .filter((v) => {
            const matchesSearch = v.code
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
            const matchesStatus =
                filterStatus === "all" ? true : v.status === filterStatus;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const getStatusConfig = (status) => {
        switch (status) {
            case "active":
                return {
                    label: "Active",
                    icon: CheckCircle,
                    color: "text-green-400",
                    bg: "bg-green-500/20",
                    border: "border-green-500/30",
                };
            case "pending_approval":
                return {
                    label: "Pending Approval",
                    icon: Clock,
                    color: "text-yellow-400",
                    bg: "bg-yellow-500/20",
                    border: "border-yellow-500/30",
                };
            case "rejected":
                return {
                    label: "Rejected",
                    icon: XCircle,
                    color: "text-red-400",
                    bg: "bg-red-500/20",
                    border: "border-red-500/30",
                };
            default:
                return {
                    label: status,
                    icon: AlertCircle,
                    color: "text-gray-400",
                    bg: "bg-gray-500/20",
                    border: "border-gray-500/30",
                };
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Voucher Approvals</h2>
                    <p className="text-gray-400 text-sm">
                        Manage and approve vouchers created by staff
                    </p>
                </div>

                {/* Branch Selector */}
                <div className="relative min-w-[200px]">
                    <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-lg px-4 py-2 appearance-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    >
                        <option value="" disabled>
                            Select Branch
                        </option>
                        {branches.map((branch) => (
                            <option key={branch._id} value={branch._id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
            </div>

            {/* Controls */}
            <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333333]">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    {/* Tabs */}
                    <div className="flex space-x-2 bg-[#111111] p-1 rounded-lg w-fit">
                        {[
                            { id: "pending_approval", label: "Pending" },
                            { id: "active", label: "Active" },
                            { id: "rejected", label: "Rejected" },
                            { id: "all", label: "All" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setFilterStatus(tab.id)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterStatus === tab.id
                                    ? "bg-[var(--color-primary)] text-white shadow-lg"
                                    : "text-gray-400 hover:text-white hover:bg-[#222222]"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent w-full md:w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#333333] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#333333]">
                        <thead className="bg-[#111111]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Voucher Info
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Value
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Created By
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333333]">
                            {filteredVouchers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No vouchers found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredVouchers.map((voucher) => {
                                    const statusConfig = getStatusConfig(voucher.status);
                                    const StatusIcon = statusConfig.icon;

                                    return (
                                        <tr key={voucher._id} className="hover:bg-[#222222] transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-mono font-bold">
                                                        {voucher.code}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        Expires: {voucher.formattedExpiresAt}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-white font-bold">
                                                    {voucher.formattedValue}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {voucher.points_required} points
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-300">
                                                    {voucher.created_by_username}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(voucher.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div
                                                    className={`flex items-center space-x-2 px-3 py-1 rounded-full w-fit border ${statusConfig.bg} ${statusConfig.border}`}
                                                >
                                                    <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                                                    <span className={`text-xs font-medium ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                                {voucher.status === "rejected" && voucher.rejection_reason && (
                                                    <div className="mt-1 text-xs text-red-400 max-w-[200px] truncate" title={voucher.rejection_reason}>
                                                        Reason: {voucher.rejection_reason}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {voucher.status === "pending_approval" && (
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                setRejectModal({ id: voucher._id, reason: "" });
                                                            }}
                                                            disabled={processingId === voucher._id}
                                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveClick(voucher)}
                                                            disabled={processingId === voucher._id}
                                                            className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reject Modal */}
            {rejectModal && (
                <Modal
                    isOpen={true}
                    onClose={() => setRejectModal(null)}
                    title="Reject Voucher"
                    size="sm"
                    variant="dark"
                >
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-200">
                                <p className="font-medium">Warning</p>
                                <p className="opacity-90">Rejecting this voucher will permanently mark it as rejected. This action cannot be undone.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Rejection Reason <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={rejectModal.reason}
                                onChange={(e) =>
                                    setRejectModal({ ...rejectModal, reason: e.target.value })
                                }
                                placeholder="Please explain why this voucher is being rejected..."
                                className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent h-32 resize-none placeholder-gray-600"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-2">
                            <button
                                onClick={() => setRejectModal(null)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectModal.reason.trim() || processingId === rejectModal.id}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                            >
                                {processingId === rejectModal.id ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <XCircle className="w-4 h-4" />
                                        Reject Voucher
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Approve Modal */}
            {approveModal && (
                <Modal
                    isOpen={true}
                    onClose={() => setApproveModal(null)}
                    title="Approve Voucher"
                    size="sm"
                    variant="dark"
                >
                    <div className="space-y-6">
                        <div className="flex flex-col items-center text-center p-4">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 border border-green-500/20">
                                <ShieldCheck className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">
                                Approve Voucher {approveModal.code}?
                            </h3>
                            <p className="text-gray-400 text-sm max-w-xs">
                                This will activate the voucher and make it available for use immediately.
                            </p>
                        </div>

                        <div className="bg-[#111111] p-4 rounded-lg border border-[#333333] space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Value:</span>
                                <span className="text-white font-bold">{approveModal.formattedValue}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Points Required:</span>
                                <span className="text-white">{approveModal.points_required}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Created By:</span>
                                <span className="text-white">{approveModal.created_by_username}</span>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setApproveModal(null)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmApprove}
                                disabled={processingId === approveModal._id}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                            >
                                {processingId === approveModal._id ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Confirm Approval
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AdminVoucherManagement;
