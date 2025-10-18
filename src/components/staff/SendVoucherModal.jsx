import React, { useState, useEffect, useRef } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import SuccessModal from "../common/SuccessModal";
import { Mail, Users, Search, X, CheckCircle, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import { sendVoucherEmail, isEmailServiceConfigured } from '../../services/emailService'

const SendVoucherModal = ({ isOpen, onClose, voucher }) => {
  const { user } = useAuth()
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState([]);

  // Convex queries and mutations
  const clients = useQuery(api.services.auth.getAllUsers)
  const assignedUsers = useQuery(
    api.services.vouchers.getVoucherAssignedUsers,
    voucher ? { voucherId: voucher._id } : "skip"
  )
  const assignVoucherMutation = useMutation(api.services.vouchers.assignVoucherByCode)
  const [sentCount, setSentCount] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const dropdownRef = useRef(null);

  // Using centralized email service for voucher emails

  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    }
  }, [isOpen, voucher]);

  useEffect(() => {
    if (clients && Array.isArray(clients)) {
      // Get list of already assigned user IDs
      const assignedUserIds = assignedUsers ? assignedUsers.map(user => user._id || user.id) : [];

      const filtered = clients.filter(client =>
        client.role === 'customer' &&
        !assignedUserIds.includes(client._id || client.id) // Exclude already assigned users
      );
      setFilteredClients(filtered);
    }
  }, [clients, assignedUsers]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setCustomerSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter clients based on search term and exclude already assigned users
  useEffect(() => {
    if (clients && Array.isArray(clients)) {
      // Get list of already assigned user IDs
      const assignedUserIds = assignedUsers ? assignedUsers.map(user => user._id || user.id) : [];

      const filtered = clients.filter(client =>
        client.role === 'customer' &&
        !assignedUserIds.includes(client._id || client.id) && // Exclude already assigned users
        (client.username?.toLowerCase().includes(customerSearch.toLowerCase()) ||
         client.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
         client.nickname?.toLowerCase().includes(customerSearch.toLowerCase()))
      );
      setFilteredClients(filtered);
    }
  }, [clients, customerSearch, assignedUsers]);

  const generateQRCode = async () => {
    if (!voucher) return;
    try {
      const qrData = {
        username: "", // Will be filled when sent to specific users
        code: voucher.code,
        value: voucher.value,
      };

      const url = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: "#1A1A1A",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setSuccessDetails([]);
    onClose();
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers((prev) => {
      const userId = user._id || user.id;
      const isSelected = prev.find((u) => (u._id || u.id) === userId);
      if (isSelected) {
        return prev.filter((u) => (u._id || u.id) !== userId);
      } else {
        return [...prev, user];
      }
    });
  };

  const selectAllUsers = () => {
    setSelectedUsers([...filteredClients]);
  };

  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  const sendVoucherEmails = async () => {
    if (selectedUsers.length === 0) {
      alert("Please select at least one user to send the voucher to.");
      return;
    }

    // Validate email service configuration
    if (!isEmailServiceConfigured()) {
      alert(
        "Email service is not configured. Please check the configuration."
      );
      return;
    }

    // Check if selected users have email addresses
    const usersWithoutEmail = selectedUsers.filter(
      (user) => !user.email || user.email.trim() === ""
    );
    if (usersWithoutEmail.length > 0) {
      const usernames = usersWithoutEmail.map((u) => u.username).join(", ");
      alert(`The following users don't have email addresses: ${usernames}`);
      return;
    }

    setIsSending(true);
    setSentCount(0);
    let successfulSends = 0; // Local counter for immediate tracking

    try {
      for (const selectedUser of selectedUsers) {
        try {
          // Step 1: Assign voucher to user via Convex
          const assignData = {
            code: voucher.code,
            user_id: selectedUser._id || selectedUser.id,
            assigned_by: user.id, // Staff member assigning the voucher
          };

          console.log("Assigning voucher to user:", assignData);
          await assignVoucherMutation(assignData);
          console.log(`Voucher ${voucher.code} assigned to ${selectedUser.username}`);

          // Step 2: Generate personalized QR code for this user
          const personalizedQrData = {
            voucherId: voucher.id,
            username: selectedUser.username,
            code: voucher.code,
            value: voucher.value,
            expires_at: voucher.expires_at,
            type: "voucher",
            brand: "TipunoX Angeles Barbershop",
          };

          console.log(
            "Generating QR code for user:",
            selectedUser.username,
            "with data:",
            personalizedQrData
          );

          const personalizedQrUrl = await QRCode.toDataURL(
            JSON.stringify(personalizedQrData),
            {
              width: 200,
              margin: 1,
              color: {
                dark: "#1A1A1A",
                light: "#FFFFFF",
              },
              errorCorrectionLevel: "M",
              type: "image/png",
              quality: 0.6,
            }
          );

          // Validate QR code generation
          if (
            !personalizedQrUrl ||
            !personalizedQrUrl.startsWith("data:image/png;base64,")
          ) {
            throw new Error(
              "Failed to generate QR code for user: " + selectedUser.username
            );
          }

          // Step 3: Send email with voucher details using centralized email service
          console.log(
            "Generated QR Code URL length:",
            personalizedQrUrl.length
          );

          const voucherEmailData = {
            email: selectedUser.email,
            name: selectedUser.nickname || selectedUser.username,
            voucherCode: voucher.code,
            voucherValue: `₱${parseFloat(voucher.value).toFixed(2)}`,
            pointsRequired: voucher.points_required || 0,
            expiresAt: new Date(voucher.expires_at).toLocaleDateString(),
            qrCodeImage: personalizedQrUrl
          };

          console.log("Sending voucher email with data:", {
            ...voucherEmailData,
            qrCodeImage: `QR_CODE_DATA_URL (${personalizedQrUrl.length} chars)`,
          });

          const emailResult = await sendVoucherEmail(voucherEmailData);
//
          if (emailResult.success) {
            console.log(`Email sent successfully to ${selectedUser.email}:`, emailResult.response);
            successfulSends++;
            setSentCount((prev) => {
              const newCount = prev + 1;
              console.log(`Incrementing sent count from ${prev} to ${newCount}`);
              return newCount;
            });
          } else {
            throw new Error(emailResult.error);
          }
        } catch (error) {
          console.error(
            `Failed to assign/send voucher to ${selectedUser.username}:`,
            error
          );

          alert(
            `Failed to process voucher for ${selectedUser.username}: ${error.message}`
          );
          // Continue with other users even if one fails
        }
      }

      // Show final result
      console.log(
        "Final email send count:",
        successfulSends,
        "out of",
        selectedUsers.length
      );
      
      const details = selectedUsers.map(user => 
        `${user.username} (${user.email})`
      );
      
      if (successfulSends > 0) {
        setSuccessDetails(details.slice(0, successfulSends));
        setShowSuccessModal(true);
      } else if (selectedUsers.length > 0) {
        alert(
          "Vouchers were assigned but no emails were sent. Please check the console for errors."
        );
      }
    } catch (error) {
      console.error("Failed to assign vouchers:", error);
      alert("Failed to assign vouchers. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (!voucher) return null;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Voucher"
      size="lg"
      compact
      variant="dark"
    >
      <div className="space-y-4">
        {/* Voucher Info Card */}
        <div className="bg-[#0F0F0F]/50 border border-[#FF8C42]/20 rounded-lg p-3.5">
          <div className="flex items-start gap-3">
            {/* QR Code */}
            <div className="flex-shrink-0">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="Voucher QR"
                  className="w-16 h-16 rounded-lg"
                />
              )}
            </div>
            {/* Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white mb-2">
                Voucher {voucher.code}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Value:</span>
                  <span className="text-[#FF8C42] font-bold">₱{parseFloat(voucher.value).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Points:</span>
                  <span className="text-gray-300 font-bold">{voucher.points_required || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Uses:</span>
                  <span className="text-gray-300 font-bold">{voucher.max_uses || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expires:</span>
                  <span className="text-gray-300 font-bold">{new Date(voucher.expires_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Selection Section */}
        <div className="bg-[#0F0F0F]/50 rounded-lg p-3.5 border border-[#333333]/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-200 flex items-center">
              <Users className="w-3.5 h-3.5 text-[#FF8C42] mr-1.5" />
              Recipients ({selectedUsers.length} selected)
            </h4>
            <div className="flex gap-2">
              <button
                onClick={selectAllUsers}
                className="text-xs px-2 py-1 bg-[#2A2A2A] text-gray-300 rounded hover:bg-[#333333] transition-colors"
              >
                All
              </button>
              <button
                onClick={clearAllUsers}
                className="text-xs px-2 py-1 bg-[#2A2A2A] text-gray-300 rounded hover:bg-[#333333] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2.5" ref={dropdownRef}>
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search by username or email..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 transition-all"
            />
          </div>

          {/* Selected Users Tags */}
          {selectedUsers.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {selectedUsers.map((user) => (
                <div
                  key={user._id || user.id}
                  className="flex items-center gap-1 bg-[#FF8C42]/20 border border-[#FF8C42]/30 rounded px-2 py-1 text-xs"
                >
                  <span className="text-gray-300">{user.username}</span>
                  <button
                    onClick={() => toggleUserSelection(user)}
                    className="text-[#FF8C42] hover:text-[#FF7A2B] ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* User List */}
          <div className="border border-[#444444] rounded-lg max-h-48 overflow-y-auto bg-[#1A1A1A]">
            {isLoading ? (
              <div className="p-3 text-center text-gray-400 text-sm">
                Loading customers...
              </div>
            ) : filteredClients.length > 0 ? (
              <div className="divide-y divide-[#333333]/30">
                {filteredClients.map((client) => {
                  const isSelected = selectedUsers.find(
                    (u) => (u._id || u.id) === (client._id || client.id)
                  );
                  return (
                    <div
                      key={client._id || client.id}
                      onClick={() => toggleUserSelection(client)}
                      className={`flex items-center gap-2 p-2 cursor-pointer transition-colors text-xs ${
                        isSelected
                          ? "bg-[#FF8C42]/10 hover:bg-[#FF8C42]/20"
                          : "hover:bg-[#2A2A2A]"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "bg-[#FF8C42] border-[#FF8C42]"
                            : "border-[#444444] bg-[#1A1A1A]"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle className="w-2.5 h-2.5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-200">
                          {client.username}
                        </div>
                        <div className="text-gray-500 truncate">{client.email}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-center text-gray-400 text-sm">
                {customerSearch
                  ? "No customers found"
                  : "No customers available"}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {isSending && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-transparent border-t-blue-400"></div>
            <div className="text-xs text-blue-300">
              Sending... ({sentCount}/{selectedUsers.length})
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-3 border-t border-[#333333]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="flex-1 h-9 bg-[#2A2A2A] text-gray-300 rounded-lg font-medium hover:bg-[#333333] transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={sendVoucherEmails}
            disabled={selectedUsers.length === 0 || isSending}
            className="flex-1 h-9 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-1.5"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-transparent border-t-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" />
                Send to {selectedUsers.length}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
    
    <SuccessModal
      isOpen={showSuccessModal}
      onClose={handleSuccessModalClose}
      title="Vouchers Sent Successfully!"
      message={`Successfully assigned vouchers and sent ${successDetails.length} emails.`}
      details={successDetails}
    />
  </>
  );
};

export default SendVoucherModal;
