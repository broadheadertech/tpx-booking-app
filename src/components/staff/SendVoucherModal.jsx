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
            brand: "TPX Barbershop",
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
      title="Send Voucher via Email"
      size="lg"
    >
      <div className="space-y-6">
        {/* Voucher Info */}
        <div className="bg-[#FF8C42]/10 border-2 border-[#FF8C42]/20 rounded-2xl p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="Voucher QR Code"
                  className="w-20 h-20 rounded-lg"
                />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-[#1A1A1A] mb-1">
                Voucher {voucher.code}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[#6B6B6B]">Value:</span>{" "}
                  <span className="font-semibold">
                    ₱{parseFloat(voucher.value).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[#6B6B6B]">Points:</span>{" "}
                  <span className="font-semibold">
                    {voucher.points_required || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[#6B6B6B]">Max Uses:</span>{" "}
                  <span className="font-semibold">{voucher.max_uses || 1}</span>
                </div>
                <div>
                  <span className="text-[#6B6B6B]">Expires:</span>{" "}
                  <span className="font-semibold">
                    {new Date(voucher.expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-[#1A1A1A] flex items-center">
              <Users className="w-5 h-5 text-[#FF8C42] mr-2" />
              Select Recipients ({selectedUsers.length} selected)
            </h4>
            <div className="flex space-x-2">
              <button
                onClick={selectAllUsers}
                className="text-xs px-3 py-1 border border-[#FF8C42] text-[#FF8C42] rounded-lg hover:bg-[#FF8C42]/10"
              >
                Select All
              </button>
              <button
                onClick={clearAllUsers}
                className="text-xs px-3 py-1 border border-[#6B6B6B] text-[#6B6B6B] rounded-lg hover:bg-[#6B6B6B]/10"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full h-10 px-4 pr-10 border-2 border-[#F5F5F5] rounded-xl text-sm focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6B6B6B] w-4 h-4" />
            </div>
          </div>

          {/* Selected Users Preview */}
          {selectedUsers.length > 0 && (
            <div className="border-2 border-[#F5F5F5] rounded-xl p-3">
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user._id || user.id}
                    className="flex items-center space-x-1 bg-[#FF8C42]/10 border border-[#FF8C42]/20 rounded-lg px-2 py-1 text-xs"
                  >
                    <span className="text-[#1A1A1A] font-medium">
                      {user.username}
                    </span>
                    <button
                      onClick={() => toggleUserSelection(user)}
                      className="text-[#FF8C42] hover:text-[#FF7A2B]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User List */}
          <div className="border-2 border-[#F5F5F5] rounded-xl max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-[#6B6B6B]">
                Loading customers...
              </div>
            ) : filteredClients.length > 0 ? (
              <div className="p-2 space-y-1">
                {filteredClients.map((client) => {
                  const isSelected = selectedUsers.find(
                    (u) => (u._id || u.id) === (client._id || client.id)
                  );
                  return (
                    <div
                      key={client._id || client.id}
                      onClick={() => toggleUserSelection(client)}
                      className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#FF8C42]/10 border-[#FF8C42]/20 border"
                          : "hover:bg-[#F5F5F5]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? "bg-[#FF8C42] border-[#FF8C42]"
                            : "border-[#D1D5DB]"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[#1A1A1A] text-sm">
                          {client.username}
                        </div>
                        <div className="text-xs text-[#6B6B6B]">
                          {client.email}
                        </div>
                        {client.nickname && (
                          <div className="text-xs text-[#FF8C42]">
                            "{client.nickname}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-[#6B6B6B]">
                {customerSearch
                  ? "No customers found matching your search."
                  : "No customers available."}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {isSending && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <div className="text-blue-700">
                Assigning vouchers and sending emails... ({sentCount}/
                {selectedUsers.length})
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-4 pt-6 border-t border-[#F5F5F5]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSending}
            className="flex-1 border-[#6B6B6B] text-[#6B6B6B] hover:bg-[#6B6B6B] hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={sendVoucherEmails}
            disabled={selectedUsers.length === 0 || isSending}
            className="flex-1 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white hover:shadow-lg flex items-center justify-center"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Assigning...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Assign & Send to {selectedUsers.length} User
                {selectedUsers.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>

        {/* EmailJS Setup Notice */}
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
