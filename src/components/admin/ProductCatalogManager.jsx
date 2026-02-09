import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Plus,
  Package,
  Search,
  X,
  Upload,
  RefreshCw,
  Camera,
  Warehouse,
  ShoppingCart,
  Store,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Eye,
  Phone,
  Mail,
  TrendingDown,
  TrendingUp,
  Archive,
  Edit2,
  Trash2,
  Lock,
  DollarSign,
  CreditCard,
  FileText,
  Building,
  Banknote,
  Star,
  Zap,
} from "lucide-react";
import Skeleton from "../common/Skeleton";
import Modal from "../common/Modal";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useToast } from "../common/ToastNotification";

/**
 * Product categories aligned with branch-level products
 */
const PRODUCT_CATEGORIES = [
  { id: "hair-care", label: "Hair Care" },
  { id: "beard-care", label: "Beard Care" },
  { id: "shaving", label: "Shaving" },
  { id: "tools", label: "Tools" },
  { id: "accessories", label: "Accessories" },
];

/**
 * Format price as Philippine Peso
 */
const formatPrice = (price) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

/**
 * Format date for display
 */
const formatDate = (timestamp) => {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Get category label from ID
 */
const getCategoryLabel = (categoryId) => {
  const category = PRODUCT_CATEGORIES.find((c) => c.id === categoryId);
  return category ? category.label : categoryId?.replace("-", " ");
};

/**
 * Stock Status Badge Component
 */
const StockStatusBadge = ({ status }) => {
  const styles = {
    "in-stock": "bg-green-500/20 text-green-400 border-green-500/30",
    "low-stock": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "out-of-stock": "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const labels = {
    "in-stock": "In Stock",
    "low-stock": "Low Stock",
    "out-of-stock": "Out of Stock",
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

/**
 * Order Status Badge Component
 */
const OrderStatusBadge = ({ status }) => {
  const config = {
    pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", icon: Clock, label: "Pending" },
    approved: { bg: "bg-blue-500/20", text: "text-blue-400", icon: CheckCircle, label: "Approved" },
    shipped: { bg: "bg-purple-500/20", text: "text-purple-400", icon: Truck, label: "Shipped" },
    received: { bg: "bg-green-500/20", text: "text-green-400", icon: CheckCircle, label: "Received" },
    rejected: { bg: "bg-red-500/20", text: "text-red-400", icon: XCircle, label: "Rejected" },
    cancelled: { bg: "bg-gray-500/20", text: "text-gray-400", icon: XCircle, label: "Cancelled" },
  };

  const { bg, text, icon: Icon, label } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

/**
 * Payment Status Badge Component
 */
const PaymentBadge = ({ isPaid, paidAt }) => {
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <DollarSign className="w-3 h-3" />
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
      <CreditCard className="w-3 h-3" />
      Unpaid
    </span>
  );
};

/**
 * Payment Methods for dropdown
 */
const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "bank_transfer", label: "Bank Transfer" },
  { id: "check", label: "Check" },
  { id: "gcash", label: "GCash" },
  { id: "maya", label: "Maya" },
];

/**
 * Summary Card Component
 */
const SummaryCard = ({ icon: Icon, label, value, subValue, variant = "default" }) => {
  const variants = {
    default: "border-[#333333]",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    danger: "border-red-500/30 bg-red-500/5",
    success: "border-green-500/30 bg-green-500/5",
  };

  return (
    <div className={`bg-[#1A1A1A] border ${variants[variant]} rounded-xl p-4`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${variant === "warning" ? "bg-yellow-500/20" : variant === "danger" ? "bg-red-500/20" : variant === "success" ? "bg-green-500/20" : "bg-[#FF8C42]/20"}`}>
          <Icon className={`w-5 h-5 ${variant === "warning" ? "text-yellow-400" : variant === "danger" ? "text-red-400" : variant === "success" ? "text-green-400" : "text-[#FF8C42]"}`} />
        </div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-white font-bold text-xl">{value}</p>
          {subValue && <p className="text-gray-500 text-xs">{subValue}</p>}
        </div>
      </div>
    </div>
  );
};

/**
 * Inventory Product Card Component (with stock info)
 */
const InventoryProductCard = ({ product, onReceiveStock, onViewBatches, onEdit, onDelete }) => {
  const imageUrl = product.resolvedImageUrl || product.image_url;
  const stockPercent = product.minStock > 0 ? Math.min((product.stock / (product.minStock * 2)) * 100, 100) : 100;

  return (
    <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl overflow-hidden hover:border-[#FF8C42]/50 transition-colors group">
      {/* Product Image */}
      <div className="aspect-square bg-[#111111] relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center ${imageUrl ? "hidden" : ""}`}>
          <Package className="w-16 h-16 text-gray-600" />
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          {product.price_enforced && (
            <span className="bg-purple-500/80 text-white p-1 rounded" title="Price Enforced">
              <Lock className="w-3 h-3" />
            </span>
          )}
          <StockStatusBadge status={product.stockStatus} />
        </div>
        {/* Edit/Delete overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onEdit(product)}
            className="p-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors text-white"
            title="Edit Product"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors text-white"
            title="Delete Product"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-white font-semibold line-clamp-1">{product.name}</h3>
          {product.brand && <p className="text-xs text-gray-500">{product.brand}</p>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-[#111111] text-gray-400 rounded-full capitalize">
            {getCategoryLabel(product.category)}
          </span>
        </div>

        {/* Stock Level Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Stock Level</span>
            <span className={product.stock <= product.minStock ? "text-yellow-400" : "text-green-400"}>
              {product.stock} / {product.minStock * 2}
            </span>
          </div>
          <div className="h-2 bg-[#111111] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                product.stock === 0 ? "bg-red-500" : product.stock <= product.minStock ? "bg-yellow-500" : "bg-green-500"
              }`}
              style={{ width: `${stockPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Min Stock: {product.minStock}</p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#333333]">
          <span className="text-[#FF8C42] font-bold">{formatPrice(product.price)}</span>
          <div className="flex gap-2">
            <button
              onClick={() => onViewBatches(product)}
              className="p-2 bg-[#111111] rounded-lg hover:bg-[#222222] transition-colors text-gray-400 hover:text-white"
              title="View Batches (FIFO)"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReceiveStock(product)}
              className="p-2 bg-[#FF8C42]/20 rounded-lg hover:bg-[#FF8C42]/30 transition-colors text-[#FF8C42]"
              title="Receive Stock"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Loading skeleton for product grid
 */
const ProductsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-[#1A1A1A] border border-[#333333] rounded-xl overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Add Product Modal Component with Image Upload and Stock Fields
 */
const AddProductModal = ({ isOpen, onClose }) => {
  const { user } = useCurrentUser();
  const toast = useToast();
  const addProduct = useMutation(api.services.productCatalog.addProduct);
  const generateUploadUrl = useMutation(api.services.productCatalog.generateUploadUrl);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    cost: "",
    category: "hair-care",
    brand: "",
    sku: "",
    stock: "0",
    minStock: "10",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Product name is required";
    const priceNum = parseFloat(formData.price);
    if (!formData.price || isNaN(priceNum) || priceNum <= 0) newErrors.price = "Price must be greater than 0";
    if (!formData.category) newErrors.category = "Category is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: "Image size must be less than 5MB" }));
        return;
      }
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, image: "Please select a valid image file" }));
        return;
      }
      setSelectedImage(file);
      setErrors((prev) => ({ ...prev, image: "" }));
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === "string") {
          setImagePreview(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return null;
    try {
      setUploadingImage(true);
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedImage.type },
        body: selectedImage,
      });
      if (!result.ok) throw new Error("Failed to upload image");
      const { storageId } = await result.json();
      return storageId;
    } catch (err) {
      setErrors((prev) => ({ ...prev, image: "Failed to upload image" }));
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!user) return;

    setIsSubmitting(true);
    try {
      let imageStorageId = null;
      if (selectedImage) {
        imageStorageId = await handleImageUpload();
        if (!imageStorageId && selectedImage) {
          setIsSubmitting(false);
          return;
        }
      }

      await addProduct({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parseInt(formData.price, 10),
        cost: formData.cost ? parseInt(formData.cost, 10) : undefined,
        category: formData.category,
        brand: formData.brand.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        image_storage_id: imageStorageId || undefined,
        stock: parseInt(formData.stock, 10) || 0,
        minStock: parseInt(formData.minStock, 10) || 10,
        created_by: user._id,
      });

      toast.success("Success", "Product added to inventory");
      handleCloseModal();
    } catch (err) {
      toast.error("Error", err.message || "Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setFormData({ name: "", description: "", price: "", cost: "", category: "hair-care", brand: "", sku: "", stock: "0", minStock: "10" });
    setErrors({});
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCloseModal} title="Add Product to Inventory" size="lg" variant="dark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image Upload */}
        <div className="bg-[#252525] rounded-xl p-4 border border-[#333333]">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#FF8C42]" />
            Product Image
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              {imagePreview ? (
                <div className="relative group bg-[#1A1A1A] rounded-xl overflow-hidden border border-[#333333]">
                  <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/50 transition-all flex items-center justify-center">
                    <button type="button" onClick={handleRemoveImage} className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-[#444444] rounded-xl flex flex-col items-center justify-center bg-[#1A1A1A] hover:border-[#FF8C42]/50 cursor-pointer">
                  <Upload className="w-6 h-6 text-[#FF8C42] mb-1" />
                  <p className="text-xs text-gray-400">Click to upload</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>
          {errors.image && <p className="text-xs text-red-400 mt-2">{errors.image}</p>}
        </div>

        {/* Name and Brand */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Name <span className="text-red-400">*</span></label>
            <input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} className={`w-full bg-[#111111] border ${errors.name ? "border-red-500" : "border-[#333333]"} text-white rounded-lg px-3 py-2 text-sm`} />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Brand</label>
            <input type="text" value={formData.brand} onChange={(e) => handleChange("brand", e.target.value)} className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* SKU and Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">SKU</label>
            <input type="text" value={formData.sku} onChange={(e) => handleChange("sku", e.target.value)} className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm" placeholder="e.g., PROD-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Category <span className="text-red-400">*</span></label>
            <select value={formData.category} onChange={(e) => handleChange("category", e.target.value)} className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm">
              {PRODUCT_CATEGORIES.map((cat) => (<option key={cat.id} value={cat.id}>{cat.label}</option>))}
            </select>
          </div>
        </div>

        {/* Price and Cost */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Selling Price (PHP) <span className="text-red-400">*</span></label>
            <input type="number" value={formData.price} onChange={(e) => handleChange("price", e.target.value)} min="1" className={`w-full bg-[#111111] border ${errors.price ? "border-red-500" : "border-[#333333]"} text-white rounded-lg px-3 py-2 text-sm`} />
            {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Cost (PHP)</label>
            <input type="number" value={formData.cost} onChange={(e) => handleChange("cost", e.target.value)} min="0" className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Stock and Min Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Initial Stock</label>
            <input type="number" value={formData.stock} onChange={(e) => handleChange("stock", e.target.value)} min="0" className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Min Stock (Alert Threshold)</label>
            <input type="number" value={formData.minStock} onChange={(e) => handleChange("minStock", e.target.value)} min="1" className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
          <textarea value={formData.description} onChange={(e) => handleChange("description", e.target.value)} rows={2} className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm resize-none" />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#333333]">
          <button type="button" onClick={handleCloseModal} disabled={isSubmitting} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" disabled={isSubmitting || uploadingImage} className="px-6 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Adding...</> : <><Plus className="w-4 h-4" /> Add Product</>}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Receive Stock Modal
 */
const ReceiveStockModal = ({ isOpen, onClose, product }) => {
  const { user } = useCurrentUser();
  const toast = useToast();
  const receiveStock = useMutation(api.services.productCatalog.receiveStock);

  const [formData, setFormData] = useState({ quantity: "", supplier: "", cost_per_unit: "", notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product || !user) return;

    const quantity = parseInt(formData.quantity, 10);
    if (!quantity || quantity <= 0) {
      toast.error("Error", "Quantity must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      await receiveStock({
        product_id: product._id,
        quantity,
        cost_per_unit: formData.cost_per_unit ? parseInt(formData.cost_per_unit, 10) : undefined,
        supplier: formData.supplier || undefined,
        notes: formData.notes || undefined,
        created_by: user._id,
      });
      toast.success("Success", `Received ${quantity} units of ${product.name}`);
      handleClose();
    } catch (err) {
      toast.error("Error", err.message || "Failed to receive stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ quantity: "", supplier: "", cost_per_unit: "", notes: "" });
    onClose();
  };

  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Receive Stock: ${product.name}`} variant="dark">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-[#252525] p-3 rounded-lg border border-[#333333]">
          <p className="text-sm text-gray-400">Current Stock: <span className="text-white font-semibold">{product.stock}</span></p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Quantity <span className="text-red-400">*</span></label>
          <input type="number" value={formData.quantity} onChange={(e) => setFormData((p) => ({ ...p, quantity: e.target.value }))} min="1" className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2" placeholder="Enter quantity received" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Supplier</label>
          <input type="text" value={formData.supplier} onChange={(e) => setFormData((p) => ({ ...p, supplier: e.target.value }))} className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2" placeholder="Enter supplier name" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Cost per Unit (PHP)</label>
          <input type="number" value={formData.cost_per_unit} onChange={(e) => setFormData((p) => ({ ...p, cost_per_unit: e.target.value }))} min="0" className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
          <textarea value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} rows={2} className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 resize-none" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#333333]">
          <button type="button" onClick={handleClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Receiving...</> : <><Plus className="w-4 h-4" /> Receive Stock</>}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Edit Product Modal Component
 */
const EditProductModal = ({ isOpen, onClose, product }) => {
  const { user } = useCurrentUser();
  const toast = useToast();
  const updateProduct = useMutation(api.services.productCatalog.updateProduct);
  const generateUploadUrl = useMutation(api.services.productCatalog.generateUploadUrl);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    original_price: "",
    cost: "",
    category: "hair-care",
    brand: "",
    sku: "",
    minStock: "10",
    price_enforced: false,
    // Promo/Discount fields
    discount_percent: "",
    promo_label: "",
    promo_quantity_limit: "",
    is_featured: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Populate form when product changes
  React.useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        price: product.price?.toString() || "",
        original_price: product.original_price?.toString() || "",
        cost: product.cost?.toString() || "",
        category: product.category || "hair-care",
        brand: product.brand || "",
        sku: product.sku || "",
        minStock: product.minStock?.toString() || "10",
        price_enforced: product.price_enforced || false,
        // Promo/Discount fields
        discount_percent: product.discount_percent?.toString() || "",
        promo_label: product.promo_label || "",
        promo_quantity_limit: product.promo_quantity_limit?.toString() || "",
        is_featured: product.is_featured || false,
      });
      setImagePreview(product.resolvedImageUrl || product.image_url || "");
    }
  }, [product]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Product name is required";
    const priceNum = parseFloat(formData.price);
    if (!formData.price || isNaN(priceNum) || priceNum <= 0) newErrors.price = "Price must be greater than 0";
    if (!formData.category) newErrors.category = "Category is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: "Image size must be less than 5MB" }));
        return;
      }
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, image: "Please select a valid image file" }));
        return;
      }
      setSelectedImage(file);
      setErrors((prev) => ({ ...prev, image: "" }));
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === "string") {
          setImagePreview(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return null;
    try {
      setUploadingImage(true);
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedImage.type },
        body: selectedImage,
      });
      if (!result.ok) throw new Error("Failed to upload image");
      const { storageId } = await result.json();
      return storageId;
    } catch (err) {
      setErrors((prev) => ({ ...prev, image: "Failed to upload image" }));
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !product) return;

    setIsSubmitting(true);
    try {
      let imageStorageId = undefined;
      if (selectedImage) {
        imageStorageId = await handleImageUpload();
        if (!imageStorageId && selectedImage) {
          setIsSubmitting(false);
          return;
        }
      }

      const updateData = {
        product_id: product._id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parseInt(formData.price, 10),
        original_price: formData.original_price ? parseInt(formData.original_price, 10) : undefined,
        cost: formData.cost ? parseInt(formData.cost, 10) : undefined,
        category: formData.category,
        brand: formData.brand.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        minStock: parseInt(formData.minStock, 10) || 10,
        price_enforced: formData.price_enforced,
        // Promo/Discount fields
        discount_percent: formData.discount_percent ? parseInt(formData.discount_percent, 10) : undefined,
        promo_label: formData.promo_label.trim() || undefined,
        promo_quantity_limit: formData.promo_quantity_limit ? parseInt(formData.promo_quantity_limit, 10) : undefined,
        is_featured: formData.is_featured,
      };

      if (imageStorageId) {
        updateData.image_storage_id = imageStorageId;
      }

      await updateProduct(updateData);

      toast.success("Success", "Product updated successfully");
      handleCloseModal();
    } catch (err) {
      toast.error("Error", err.message || "Failed to update product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setErrors({});
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleCloseModal} title="Edit Product" size="lg" variant="dark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image Upload */}
        <div className="bg-[#252525] rounded-xl p-4 border border-[#333333]">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#FF8C42]" />
            Product Image
          </h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              {imagePreview ? (
                <div className="relative group bg-[#1A1A1A] rounded-xl overflow-hidden border border-[#333333]">
                  <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/50 transition-all flex items-center justify-center">
                    <button type="button" onClick={handleRemoveImage} className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-[#444444] rounded-xl flex flex-col items-center justify-center bg-[#1A1A1A] hover:border-[#FF8C42]/50 cursor-pointer">
                  <Upload className="w-6 h-6 text-[#FF8C42] mb-1" />
                  <p className="text-xs text-gray-400">Click to upload</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          </div>
          {errors.image && <p className="text-xs text-red-400 mt-2">{errors.image}</p>}
        </div>

        {/* Name and Brand */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Name <span className="text-red-400">*</span></label>
            <input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} className={`w-full bg-[#111111] border ${errors.name ? "border-red-500" : "border-[#333333]"} text-white rounded-lg px-3 py-2 text-sm`} />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Brand</label>
            <input type="text" value={formData.brand} onChange={(e) => handleChange("brand", e.target.value)} className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* SKU and Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">SKU</label>
            <input type="text" value={formData.sku} onChange={(e) => handleChange("sku", e.target.value)} className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm" placeholder="e.g., PROD-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Category <span className="text-red-400">*</span></label>
            <select value={formData.category} onChange={(e) => handleChange("category", e.target.value)} className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm">
              {PRODUCT_CATEGORIES.map((cat) => (<option key={cat.id} value={cat.id}>{cat.label}</option>))}
            </select>
          </div>
        </div>

        {/* Price and Cost */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Selling Price (PHP) <span className="text-red-400">*</span></label>
            <input type="number" value={formData.price} onChange={(e) => handleChange("price", e.target.value)} min="1" className={`w-full bg-[#111111] border ${errors.price ? "border-red-500" : "border-[#333333]"} text-white rounded-lg px-3 py-2 text-sm`} />
            {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Cost (PHP)</label>
            <input type="number" value={formData.cost} onChange={(e) => handleChange("cost", e.target.value)} min="0" className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Min Stock */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Min Stock (Alert Threshold)</label>
          <input type="number" value={formData.minStock} onChange={(e) => handleChange("minStock", e.target.value)} min="1" className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
          <textarea value={formData.description} onChange={(e) => handleChange("description", e.target.value)} rows={2} className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm resize-none" />
        </div>

        {/* Price Enforcement Toggle */}
        <div className="bg-[#252525] rounded-xl p-4 border border-[#333333]">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                Enforce MSRP
              </label>
              <p className="text-xs text-gray-500 mt-1">Branches cannot change this price when enabled</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange("price_enforced", !formData.price_enforced)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.price_enforced ? "bg-purple-500" : "bg-[#333333]"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                formData.price_enforced ? "translate-x-6" : ""
              }`} />
            </button>
          </div>
        </div>

        {/* Promo/Discount Section */}
        <div className="bg-gradient-to-br from-[#2A1810] to-[#252525] rounded-xl p-4 border border-orange-500/30">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            Promotion Settings
          </h3>

          {/* Discount % and Original Price */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Discount %</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.discount_percent}
                  onChange={(e) => handleChange("discount_percent", e.target.value)}
                  min="0"
                  max="100"
                  placeholder="e.g., 37"
                  className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave empty for no discount</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Original Price (PHP)</label>
              <input
                type="number"
                value={formData.original_price}
                onChange={(e) => handleChange("original_price", e.target.value)}
                min="0"
                placeholder="e.g., 699"
                className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Shown with strikethrough</p>
            </div>
          </div>

          {/* Promo Label and Quantity Limit */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Promo Label</label>
              <div className="flex gap-2 flex-wrap">
                {["", "Flash Sale", "Hot Deal", "Limited", "New"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleChange("promo_label", label)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                      formData.promo_label === label
                        ? "bg-orange-500 text-white"
                        : "bg-[#333333] text-gray-400 hover:bg-[#444444]"
                    }`}
                  >
                    {label || "None"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Quantity Limit</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.promo_quantity_limit}
                  onChange={(e) => handleChange("promo_quantity_limit", e.target.value)}
                  min="1"
                  placeholder="e.g., 50"
                  className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Max items at promo price</p>
            </div>
          </div>

          {/* Featured Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-[#333333]">
            <div>
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                Featured in Flash Sales
              </label>
              <p className="text-xs text-gray-500 mt-1">Show in flash sale carousel</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange("is_featured", !formData.is_featured)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.is_featured ? "bg-yellow-500" : "bg-[#333333]"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                formData.is_featured ? "translate-x-6" : ""
              }`} />
            </button>
          </div>

          {/* Preview */}
          {(formData.discount_percent || formData.original_price) && (
            <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#333333]">
              <p className="text-xs text-gray-500 mb-2">Price Preview:</p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-orange-400">₱{formData.price || "0"}</span>
                {formData.original_price && (
                  <span className="text-sm text-gray-500 line-through">₱{formData.original_price}</span>
                )}
                {formData.discount_percent && (
                  <span className="px-2 py-0.5 bg-orange-500 rounded text-xs font-bold text-white">
                    -{formData.discount_percent}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#333333]">
          <button type="button" onClick={handleCloseModal} disabled={isSubmitting} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" disabled={isSubmitting || uploadingImage} className="px-6 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <><Edit2 className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Delete Confirmation Modal
 */
const DeleteConfirmModal = ({ isOpen, onClose, product, onConfirm }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Product" variant="dark">
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">
            Are you sure you want to delete <strong className="text-white">{product.name}</strong>?
          </p>
          <p className="text-gray-500 text-xs mt-2">
            This will remove the product from the catalog. Branches will no longer see this product.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#333333]">
          <button onClick={onClose} disabled={isDeleting} className="px-4 py-2 text-gray-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/**
 * View Batches Modal (FIFO)
 */
const ViewBatchesModal = ({ isOpen, onClose, product }) => {
  const productWithBatches = useQuery(
    api.services.productCatalog.getProductWithBatches,
    product ? { product_id: product._id } : "skip"
  );

  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`FIFO Batches: ${product.name}`} size="lg" variant="dark">
      <div className="space-y-4">
        <div className="bg-[#252525] p-3 rounded-lg border border-[#333333] flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Total Stock</p>
            <p className="text-white font-bold text-xl">{productWithBatches?.stock || 0}</p>
          </div>
          {productWithBatches?.oldestBatchDate && (
            <div className="text-right">
              <p className="text-sm text-gray-400">Oldest Batch</p>
              <p className="text-yellow-400 text-sm">{formatDate(productWithBatches.oldestBatchDate)}</p>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-400 flex items-center gap-2">
          <Archive className="w-4 h-4" />
          <span>Batches are consumed in FIFO order (First In, First Out)</span>
        </div>

        {productWithBatches?.batches?.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {productWithBatches.batches.map((batch, index) => (
              <div key={batch._id} className={`bg-[#1A1A1A] border ${index === 0 ? "border-yellow-500/30" : "border-[#333333]"} rounded-lg p-3`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium text-sm">{batch.batch_number}</p>
                    <p className="text-gray-500 text-xs">Received: {formatDate(batch.received_at)}</p>
                    {batch.supplier && <p className="text-gray-500 text-xs">Supplier: {batch.supplier}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{batch.quantity}</p>
                    <p className="text-gray-500 text-xs">of {batch.initial_quantity}</p>
                  </div>
                </div>
                {index === 0 && (
                  <div className="mt-2 pt-2 border-t border-[#333333]">
                    <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">Next to consume</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Archive className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No batches recorded yet</p>
            <p className="text-xs">Receive stock to create batches</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ============================================
// TAB 1: MY INVENTORY (Central Warehouse)
// ============================================
const MyInventoryTab = () => {
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState("all");

  const products = useQuery(api.services.productCatalog.getCatalogProducts);
  const summary = useQuery(api.services.productCatalog.getInventorySummary);
  const deleteProduct = useMutation(api.services.productCatalog.deleteProduct);

  const handleReceiveStock = (product) => {
    setSelectedProduct(product);
    setShowReceiveModal(true);
  };

  const handleViewBatches = (product) => {
    setSelectedProduct(product);
    setShowBatchesModal(true);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleDeleteClick = (product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;
    try {
      await deleteProduct({ product_id: selectedProduct._id });
      toast.success("Success", "Product deleted successfully");
      setShowDeleteModal(false);
      setSelectedProduct(null);
    } catch (err) {
      toast.error("Error", err.message || "Failed to delete product");
    }
  };

  const filteredProducts = (products || []).filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || (product.brand || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || product.category === filterCategory;
    const matchesStock = filterStock === "all" || product.stockStatus === filterStock;
    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon={Package} label="Total Products" value={summary.totalProducts} />
          <SummaryCard icon={CheckCircle} label="In Stock" value={summary.inStock} variant="success" />
          <SummaryCard icon={AlertTriangle} label="Low Stock" value={summary.lowStock} variant="warning" />
          <SummaryCard icon={XCircle} label="Out of Stock" value={summary.outOfStock} variant="danger" />
        </div>
      )}

      {/* Controls */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333333]">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm">
              <option value="all">All Categories</option>
              {PRODUCT_CATEGORIES.map((cat) => (<option key={cat.id} value={cat.id}>{cat.label}</option>))}
            </select>
            <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)} className="bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm">
              <option value="all">All Stock Levels</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>

          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1 lg:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] text-white rounded-lg w-full lg:w-48 text-sm" />
            </div>
            {/* Add Product Button */}
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-[#FF8C42] text-white px-4 py-2 rounded-lg hover:bg-[#FF8C42]/90 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {products === undefined ? (
        <ProductsSkeleton />
      ) : filteredProducts.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-12 text-center">
          <Warehouse className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-2">No Products Found</h3>
          <p className="text-gray-500 mb-6">{products.length === 0 ? "Start building your inventory" : "No products match your filters"}</p>
          {products.length === 0 && (
            <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 bg-[#FF8C42] text-white px-6 py-3 rounded-lg">
              <Plus className="w-5 h-5" /> Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <InventoryProductCard
              key={product._id}
              product={product}
              onReceiveStock={handleReceiveStock}
              onViewBatches={handleViewBatches}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddProductModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <ReceiveStockModal isOpen={showReceiveModal} onClose={() => { setShowReceiveModal(false); setSelectedProduct(null); }} product={selectedProduct} />
      <ViewBatchesModal isOpen={showBatchesModal} onClose={() => { setShowBatchesModal(false); setSelectedProduct(null); }} product={selectedProduct} />
      <EditProductModal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedProduct(null); }} product={selectedProduct} />
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedProduct(null); }}
        product={selectedProduct}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

// ============================================
// MARK AS PAID MODAL
// ============================================
const MarkAsPaidModal = ({ isOpen, onClose, order, onSuccess }) => {
  const { user } = useCurrentUser();
  const toast = useToast();
  const markAsPaid = useMutation(api.services.productOrders.markOrderAsPaid);

  const [formData, setFormData] = useState({
    payment_method: "cash",
    payment_reference: "",
    payment_notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!order || !user) return;

    setIsSubmitting(true);
    try {
      await markAsPaid({
        order_id: order._id,
        paid_by: user._id,
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference || undefined,
        payment_notes: formData.payment_notes || undefined,
      });
      toast.success("Success", "Order marked as paid");
      onSuccess?.();
      handleClose();
    } catch (err) {
      toast.error("Error", err.message || "Failed to mark as paid");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ payment_method: "cash", payment_reference: "", payment_notes: "" });
    onClose();
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Mark Order as Paid" variant="dark">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-[#252525] p-4 rounded-lg border border-[#333333]">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white font-semibold">{order.order_number}</p>
              <p className="text-gray-400 text-sm">{order.branch_name}</p>
            </div>
            <div className="text-right">
              <p className="text-[#FF8C42] font-bold text-xl">{formatPrice(order.total_amount)}</p>
              <p className="text-gray-500 text-xs">{order.items.length} item(s)</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Payment Method</label>
          <select
            value={formData.payment_method}
            onChange={(e) => setFormData((p) => ({ ...p, payment_method: e.target.value }))}
            className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Reference Number (Optional)</label>
          <input
            type="text"
            value={formData.payment_reference}
            onChange={(e) => setFormData((p) => ({ ...p, payment_reference: e.target.value }))}
            className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2"
            placeholder="e.g., GCash ref, check number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Notes (Optional)</label>
          <textarea
            value={formData.payment_notes}
            onChange={(e) => setFormData((p) => ({ ...p, payment_notes: e.target.value }))}
            rows={2}
            className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#333333]">
          <button type="button" onClick={handleClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</> : <><DollarSign className="w-4 h-4" /> Mark as Paid</>}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// MANUAL ORDER MODAL
// ============================================
const ManualOrderModal = ({ isOpen, onClose }) => {
  const { user } = useCurrentUser();
  const toast = useToast();
  const createManualOrder = useMutation(api.services.productOrders.createManualOrder);

  const branches = useQuery(api.services.branches.getAllBranches);
  const products = useQuery(api.services.productCatalog.getCatalogProducts);

  const [formData, setFormData] = useState({
    branch_id: "",
    notes: "",
    auto_approve: true,
    mark_as_paid: false,
    payment_method: "cash",
    payment_reference: "",
  });
  const [orderItems, setOrderItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = (productId) => {
    const product = products?.find((p) => p._id === productId);
    if (!product) return;

    const existing = orderItems.find((i) => i.catalog_product_id === productId);
    if (existing) {
      setOrderItems((items) =>
        items.map((i) => (i.catalog_product_id === productId ? { ...i, quantity: i.quantity + 1 } : i))
      );
    } else {
      setOrderItems((items) => [
        ...items,
        { catalog_product_id: productId, product_name: product.name, quantity: 1, unit_price: product.price },
      ]);
    }
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setOrderItems((items) => items.filter((i) => i.catalog_product_id !== productId));
    } else {
      setOrderItems((items) =>
        items.map((i) => (i.catalog_product_id === productId ? { ...i, quantity } : i))
      );
    }
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !formData.branch_id || orderItems.length === 0) {
      toast.error("Error", "Please select a branch and add at least one item");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createManualOrder({
        branch_id: formData.branch_id,
        created_by: user._id,
        items: orderItems.map((i) => ({ catalog_product_id: i.catalog_product_id, quantity: i.quantity })),
        notes: formData.notes || undefined,
        auto_approve: formData.auto_approve,
        mark_as_paid: formData.mark_as_paid,
        payment_method: formData.mark_as_paid ? formData.payment_method : undefined,
        payment_reference: formData.mark_as_paid ? formData.payment_reference : undefined,
      });
      toast.success("Success", `Order ${result.orderNumber} created`);
      handleClose();
    } catch (err) {
      toast.error("Error", err.message || "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ branch_id: "", notes: "", auto_approve: true, mark_as_paid: false, payment_method: "cash", payment_reference: "" });
    setOrderItems([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Manual Order" size="lg" variant="dark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Branch Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Select Branch <span className="text-red-400">*</span></label>
          <select
            value={formData.branch_id}
            onChange={(e) => setFormData((p) => ({ ...p, branch_id: e.target.value }))}
            className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2"
          >
            <option value="">-- Select Branch --</option>
            {branches?.filter((b) => b.is_active).map((branch) => (
              <option key={branch._id} value={branch._id}>{branch.name} ({branch.branch_code})</option>
            ))}
          </select>
        </div>

        {/* Product Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Add Products</label>
          <select
            onChange={(e) => { if (e.target.value) { addItem(e.target.value); e.target.value = ""; } }}
            className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2"
          >
            <option value="">-- Select Product to Add --</option>
            {products?.filter((p) => p.is_active && p.stock > 0).map((product) => (
              <option key={product._id} value={product._id}>
                {product.name} - {formatPrice(product.price)} (Stock: {product.stock})
              </option>
            ))}
          </select>
        </div>

        {/* Order Items */}
        {orderItems.length > 0 && (
          <div className="bg-[#252525] rounded-lg border border-[#333333] p-3 space-y-2">
            <p className="text-sm font-medium text-gray-400">Order Items</p>
            {orderItems.map((item) => (
              <div key={item.catalog_product_id} className="flex items-center justify-between bg-[#1A1A1A] p-2 rounded">
                <div className="flex-1">
                  <p className="text-white text-sm">{item.product_name}</p>
                  <p className="text-gray-500 text-xs">{formatPrice(item.unit_price)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQuantity(item.catalog_product_id, item.quantity - 1)} className="w-6 h-6 bg-[#333] rounded text-white">-</button>
                  <span className="text-white w-8 text-center">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.catalog_product_id, item.quantity + 1)} className="w-6 h-6 bg-[#333] rounded text-white">+</button>
                  <span className="text-[#FF8C42] font-semibold ml-2 w-20 text-right">{formatPrice(item.unit_price * item.quantity)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-[#333333]">
              <span className="text-gray-400">Total</span>
              <span className="text-[#FF8C42] font-bold">{formatPrice(totalAmount)}</span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            rows={2}
            className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 resize-none"
            placeholder="Optional order notes..."
          />
        </div>

        {/* Options */}
        <div className="bg-[#252525] rounded-lg border border-[#333333] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Auto-Approve Order</p>
              <p className="text-gray-500 text-xs">Skip pending status, directly approve</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, auto_approve: !p.auto_approve }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${formData.auto_approve ? "bg-blue-500" : "bg-[#333333]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${formData.auto_approve ? "translate-x-6" : ""}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Mark as Paid</p>
              <p className="text-gray-500 text-xs">Record payment immediately</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, mark_as_paid: !p.mark_as_paid }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${formData.mark_as_paid ? "bg-emerald-500" : "bg-[#333333]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${formData.mark_as_paid ? "translate-x-6" : ""}`} />
            </button>
          </div>

          {formData.mark_as_paid && (
            <div className="pt-2 border-t border-[#333333] space-y-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData((p) => ({ ...p, payment_method: e.target.value }))}
                  className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Reference Number</label>
                <input
                  type="text"
                  value={formData.payment_reference}
                  onChange={(e) => setFormData((p) => ({ ...p, payment_reference: e.target.value }))}
                  className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#333333]">
          <button type="button" onClick={handleClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button
            type="submit"
            disabled={isSubmitting || !formData.branch_id || orderItems.length === 0}
            className="px-6 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Order</>}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// TAB 2: BRANCH ORDERS
// ============================================
const BranchOrdersTab = () => {
  const { user } = useCurrentUser();
  const toast = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderToMarkPaid, setOrderToMarkPaid] = useState(null);
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);

  // Confirmation dialog states
  const [orderToApprove, setOrderToApprove] = useState(null);
  const [orderToReject, setOrderToReject] = useState(null);
  const [orderToShip, setOrderToShip] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const orders = useQuery(api.services.productOrders.getAllOrders, filterStatus === "all" ? {} : { status: filterStatus });
  const ordersSummary = useQuery(api.services.productOrders.getOrdersSummary);
  const paymentDebug = useQuery(api.services.productOrders.getPaymentStatusDebug);

  const approveOrder = useMutation(api.services.productOrders.approveOrder);
  const rejectOrder = useMutation(api.services.productOrders.rejectOrder);
  const shipOrder = useMutation(api.services.productOrders.shipOrder);
  const backfillPayments = useMutation(api.services.productOrders.backfillReceivedOrdersAsPaid);

  const handleBackfillPayments = async () => {
    if (!user) return;
    if (!confirm("This will mark all 'Received' orders as 'Paid' using their received date. Continue?")) return;
    setIsBackfilling(true);
    try {
      const result = await backfillPayments({ admin_id: user._id });
      toast.success("Success", result.message);
    } catch (err) {
      toast.error("Error", err.message);
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleApproveConfirm = async () => {
    if (!user || !orderToApprove) return;
    setIsProcessing(true);
    try {
      await approveOrder({ order_id: orderToApprove._id, approved_by: user._id });
      toast.success("Success", "Order approved successfully");
      setOrderToApprove(null);
    } catch (err) {
      toast.error("Error", err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!user || !orderToReject || !rejectReason.trim()) return;
    setIsProcessing(true);
    try {
      await rejectOrder({ order_id: orderToReject._id, rejected_by: user._id, rejection_reason: rejectReason.trim() });
      toast.success("Success", "Order rejected");
      setOrderToReject(null);
      setRejectReason("");
    } catch (err) {
      toast.error("Error", err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShipConfirm = async () => {
    if (!user || !orderToShip) return;
    setIsProcessing(true);
    try {
      await shipOrder({ order_id: orderToShip._id, shipped_by: user._id });
      toast.success("Success", "Order marked as shipped");
      setOrderToShip(null);
    } catch (err) {
      toast.error("Error", err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const canMarkAsPaid = (order) => {
    return !order.is_paid && order.status !== "pending" && order.status !== "cancelled" && order.status !== "rejected";
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {ordersSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard icon={Clock} label="Pending" value={ordersSummary.pending} variant={ordersSummary.pending > 0 ? "warning" : "default"} />
          <SummaryCard icon={CheckCircle} label="Approved" value={ordersSummary.approved} />
          <SummaryCard icon={Truck} label="Shipped" value={ordersSummary.shipped} />
          <SummaryCard icon={Package} label="Received" value={ordersSummary.received} variant="success" />
          <SummaryCard icon={DollarSign} label="Paid" value={ordersSummary.paidOrders || 0} subValue={`${ordersSummary.unpaidOrders || 0} unpaid`} variant="success" />
        </div>
      )}

      {/* Backfill Alert - Show if there are received but unpaid orders */}
      {paymentDebug && paymentDebug.summary.receivedButUnpaid > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-400 font-medium">Received Orders Need Payment Status</p>
              <p className="text-gray-400 text-sm mt-1">
                {paymentDebug.summary.receivedButUnpaid} order(s) are marked as "Received" but don't have payment status.
                These orders won't appear in P&L until marked as paid.
              </p>
              <button
                onClick={handleBackfillPayments}
                disabled={isBackfilling}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isBackfilling ? "animate-spin" : ""}`} />
                {isBackfilling ? "Processing..." : "Mark All Received as Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333333]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            {["all", "pending", "approved", "shipped", "received", "rejected"].map((status) => (
              <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filterStatus === status ? "bg-[#FF8C42] text-white" : "bg-[#111111] text-gray-400 hover:text-white"}`}>
                {status === "all" ? "All Orders" : status}
              </button>
            ))}
          </div>
          {/* Manual Order Button */}
          <button
            onClick={() => setShowManualOrderModal(true)}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            <FileText className="w-4 h-4" /> Create Manual Order
          </button>
        </div>
      </div>

      {/* Orders List */}
      {orders === undefined ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-24 rounded-xl" />))}</div>
      ) : orders.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-2">No Orders</h3>
          <p className="text-gray-500 mb-4">No branch orders to display</p>
          <button
            onClick={() => setShowManualOrderModal(true)}
            className="inline-flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-5 h-5" /> Create First Order
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className={`bg-[#1A1A1A] border ${order.is_manual_order ? "border-blue-500/30" : "border-[#333333]"} rounded-xl p-4`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-white font-semibold">{order.order_number}</span>
                    <OrderStatusBadge status={order.status} />
                    <PaymentBadge isPaid={order.is_paid} paidAt={order.paid_at} />
                    {order.is_manual_order && (
                      <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">Manual</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">
                    <span className="font-medium text-white">{order.branch_name}</span> ({order.branch_code})
                  </p>
                  <p className="text-gray-500 text-xs">
                    {order.is_manual_order ? "Created by admin" : `Requested by ${order.requested_by_name}`} on {formatDate(order.created_at)}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {order.items.length} item(s) - <span className="text-[#FF8C42] font-semibold">{formatPrice(order.total_amount)}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedOrder(order)} className="p-2 bg-[#111111] rounded-lg hover:bg-[#222222] text-gray-400 hover:text-white" title="View Details">
                    <Eye className="w-4 h-4" />
                  </button>
                  {order.status === "pending" && (
                    <>
                      <button onClick={() => setOrderToApprove(order)} className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 text-sm flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => setOrderToReject(order)} className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </>
                  )}
                  {order.status === "approved" && (
                    <button onClick={() => setOrderToShip(order)} className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 text-sm flex items-center gap-1">
                      <Truck className="w-4 h-4" /> Ship
                    </button>
                  )}
                  {canMarkAsPaid(order) && (
                    <button
                      onClick={() => setOrderToMarkPaid(order)}
                      className="px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 text-sm flex items-center gap-1"
                    >
                      <Banknote className="w-4 h-4" /> Mark Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order: ${selectedOrder.order_number}`} size="lg" variant="dark">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-semibold">{selectedOrder.branch_name}</p>
                <p className="text-gray-500 text-sm">Code: {selectedOrder.branch_code}</p>
              </div>
              <div className="flex gap-2">
                <OrderStatusBadge status={selectedOrder.status} />
                <PaymentBadge isPaid={selectedOrder.is_paid} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Requested By</p>
                <p className="text-white">{selectedOrder.requested_by_name}</p>
              </div>
              <div>
                <p className="text-gray-400">Order Date</p>
                <p className="text-white">{formatDate(selectedOrder.created_at)}</p>
              </div>
              {selectedOrder.is_paid && (
                <>
                  <div>
                    <p className="text-gray-400">Paid On</p>
                    <p className="text-emerald-400">{formatDate(selectedOrder.paid_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Payment Method</p>
                    <p className="text-white capitalize">{selectedOrder.payment_method?.replace("_", " ") || "-"}</p>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-[#333333] pt-4">
              <p className="text-gray-400 text-sm mb-2">Items</p>
              <div className="space-y-2">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="bg-[#111111] p-3 rounded-lg flex justify-between">
                    <div>
                      <p className="text-white">{item.product_name}</p>
                      <p className="text-gray-500 text-xs">{formatPrice(item.unit_price)} each</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white">x{item.quantity_approved || item.quantity_requested}</p>
                      <p className="text-[#FF8C42]">{formatPrice(item.unit_price * (item.quantity_approved || item.quantity_requested))}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#333333] pt-4 flex justify-between">
              <span className="text-gray-400">Total</span>
              <span className="text-[#FF8C42] font-bold text-xl">{formatPrice(selectedOrder.total_amount)}</span>
            </div>

            {/* Action buttons in modal */}
            {canMarkAsPaid(selectedOrder) && (
              <div className="border-t border-[#333333] pt-4">
                <button
                  onClick={() => { setSelectedOrder(null); setOrderToMarkPaid(selectedOrder); }}
                  className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center justify-center gap-2"
                >
                  <Banknote className="w-5 h-5" /> Mark as Paid
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Mark as Paid Modal */}
      <MarkAsPaidModal
        isOpen={!!orderToMarkPaid}
        onClose={() => setOrderToMarkPaid(null)}
        order={orderToMarkPaid}
      />

      {/* Manual Order Modal */}
      <ManualOrderModal
        isOpen={showManualOrderModal}
        onClose={() => setShowManualOrderModal(false)}
      />

      {/* Approve Order Confirmation Modal */}
      {orderToApprove && (
        <Modal isOpen={!!orderToApprove} onClose={() => !isProcessing && setOrderToApprove(null)} title="Confirm Approval" size="md" variant="dark">
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold">Approve Order #{orderToApprove.order_number}?</h4>
                  <p className="text-gray-400 text-sm mt-1">
                    This will approve the order from <span className="text-white font-medium">{orderToApprove.branch_name}</span> for {orderToApprove.items?.length || 0} item(s) totaling <span className="text-[#FF8C42] font-semibold">{formatPrice(orderToApprove.total_amount)}</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#111111] rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">Order Items:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {orderToApprove.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-300">{item.product_name} × {item.quantity_approved || item.quantity_requested || item.quantity}</span>
                    <span className="text-gray-400">{formatPrice(item.unit_price * (item.quantity_approved || item.quantity_requested || item.quantity))}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setOrderToApprove(null)}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 bg-[#333333] hover:bg-[#444444] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveConfirm}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {isProcessing ? "Approving..." : "Approve Order"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Order Confirmation Modal */}
      {orderToReject && (
        <Modal isOpen={!!orderToReject} onClose={() => !isProcessing && (setOrderToReject(null), setRejectReason(""))} title="Reject Order" size="md" variant="dark">
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold">Reject Order #{orderToReject.order_number}?</h4>
                  <p className="text-gray-400 text-sm mt-1">
                    This will reject the order from <span className="text-white font-medium">{orderToReject.branch_name}</span>. The branch will be notified of the rejection.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Rejection Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejecting this order..."
                rows={3}
                className="w-full bg-[#111111] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none resize-none"
                disabled={isProcessing}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setOrderToReject(null); setRejectReason(""); }}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 bg-[#333333] hover:bg-[#444444] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={isProcessing || !rejectReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {isProcessing ? "Rejecting..." : "Reject Order"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ship Order Confirmation Modal */}
      {orderToShip && (
        <Modal isOpen={!!orderToShip} onClose={() => !isProcessing && setOrderToShip(null)} title="Confirm Shipment" size="md" variant="dark">
          <div className="space-y-4">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Truck className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold">Ship Order #{orderToShip.order_number}?</h4>
                  <p className="text-gray-400 text-sm mt-1">
                    This will mark the order as shipped to <span className="text-white font-medium">{orderToShip.branch_name}</span>. Make sure all items are packed and ready for delivery.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#111111] rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">Items being shipped:</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {orderToShip.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-300">{item.product_name} × {item.quantity_approved || item.quantity_requested || item.quantity}</span>
                    <span className="text-gray-400">{formatPrice(item.unit_price * (item.quantity_approved || item.quantity_requested || item.quantity))}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#333333] mt-2 pt-2 flex justify-between text-sm font-semibold">
                <span className="text-gray-300">Total</span>
                <span className="text-[#FF8C42]">{formatPrice(orderToShip.total_amount)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setOrderToShip(null)}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 bg-[#333333] hover:bg-[#444444] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleShipConfirm}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
                {isProcessing ? "Processing..." : "Mark as Shipped"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================
// TAB 3: BRANCH INVENTORY
// ============================================
const BranchInventoryTab = () => {
  const [selectedBranch, setSelectedBranch] = useState(null);

  const branchSummaries = useQuery(api.services.products.getAllBranchInventorySummary);
  const branchProducts = useQuery(
    api.services.products.getProductsByBranch,
    selectedBranch ? { branch_id: selectedBranch } : "skip"
  );

  return (
    <div className="space-y-6">
      {/* Branch Selector */}
      <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#333333]">
        <label className="block text-sm font-medium text-gray-400 mb-2">Select Branch</label>
        <select
          value={selectedBranch || ""}
          onChange={(e) => setSelectedBranch(e.target.value || null)}
          className="w-full md:w-64 bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2"
        >
          <option value="">-- Select a branch --</option>
          {branchSummaries?.map((branch) => (
            <option key={branch.branch_id} value={branch.branch_id}>
              {branch.branch_name} ({branch.branch_code}) {branch.hasLowStockAlert ? "⚠️" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Branch Summary Cards */}
      {!selectedBranch ? (
        <div className="space-y-4">
          <h3 className="text-white font-semibold">All Branches Overview</h3>
          {branchSummaries === undefined ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-32 rounded-xl" />))}
            </div>
          ) : branchSummaries.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-12 text-center">
              <Store className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No branches found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branchSummaries.map((branch) => (
                <div
                  key={branch.branch_id}
                  onClick={() => setSelectedBranch(branch.branch_id)}
                  className={`bg-[#1A1A1A] border ${branch.hasLowStockAlert ? "border-yellow-500/30" : "border-[#333333]"} rounded-xl p-4 cursor-pointer hover:border-[#FF8C42]/50 transition-colors`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold">{branch.branch_name}</h4>
                      <p className="text-gray-500 text-xs">{branch.branch_code}</p>
                    </div>
                    {branch.hasLowStockAlert && (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-[#111111] p-2 rounded-lg">
                      <p className="text-green-400 font-semibold">{branch.inStock}</p>
                      <p className="text-gray-500 text-xs">In Stock</p>
                    </div>
                    <div className="bg-[#111111] p-2 rounded-lg">
                      <p className="text-yellow-400 font-semibold">{branch.lowStock}</p>
                      <p className="text-gray-500 text-xs">Low</p>
                    </div>
                    <div className="bg-[#111111] p-2 rounded-lg">
                      <p className="text-red-400 font-semibold">{branch.outOfStock}</p>
                      <p className="text-gray-500 text-xs">Out</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#333333] flex items-center gap-2 text-xs text-gray-400">
                    <Phone className="w-3 h-3" />
                    <span>{branch.branch_phone}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Selected Branch Products */
        <div className="space-y-4">
          {/* Branch Info Header */}
          {branchSummaries && (
            (() => {
              const branch = branchSummaries.find((b) => b.branch_id === selectedBranch);
              if (!branch) return null;
              return (
                <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{branch.branch_name}</h3>
                      <p className="text-gray-500 text-sm">{branch.branch_code}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span>{branch.branch_phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span>{branch.branch_email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{branch.totalProducts}</p>
                      <p className="text-gray-500 text-xs">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{branch.inStock}</p>
                      <p className="text-gray-500 text-xs">In Stock</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">{branch.lowStock}</p>
                      <p className="text-gray-500 text-xs">Low Stock</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">{branch.outOfStock}</p>
                      <p className="text-gray-500 text-xs">Out of Stock</p>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* Products Grid */}
          {branchProducts === undefined ? (
            <ProductsSkeleton />
          ) : branchProducts.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-12 text-center">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-white font-semibold">No Products</h3>
              <p className="text-gray-500">This branch has no products in inventory</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {branchProducts.map((product) => (
                <div key={product._id} className="bg-[#1A1A1A] border border-[#333333] rounded-xl overflow-hidden">
                  <div className="aspect-square bg-[#111111] relative">
                    {product.resolvedImageUrl ? (
                      <img src={product.resolvedImageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <StockStatusBadge status={product.stockStatus} />
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-white font-medium text-sm line-clamp-1">{product.name}</h4>
                    {product.brand && <p className="text-gray-500 text-xs">{product.brand}</p>}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[#FF8C42] font-semibold">{formatPrice(product.price)}</span>
                      <span className={`text-sm font-medium ${product.stock <= product.minStock ? "text-yellow-400" : "text-green-400"}`}>
                        Stock: {product.stock}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const ProductCatalogManager = () => {
  const [activeTab, setActiveTab] = useState("inventory");
  const pendingOrdersCount = useQuery(api.services.productOrders.getPendingOrdersCount);

  const tabs = [
    { id: "inventory", label: "My Inventory", icon: Warehouse },
    { id: "orders", label: "Branch Orders", icon: ShoppingCart, badge: pendingOrdersCount || 0 },
    { id: "branches", label: "Branch Inventory", icon: Store },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Inventory Management</h2>
        <p className="text-gray-400 text-sm">Manage central warehouse, branch orders, and monitor branch inventory</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-[#1A1A1A] p-2 rounded-xl border border-[#333333] flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === tab.id ? "bg-[#FF8C42] text-white" : "text-gray-400 hover:text-white hover:bg-[#222222]"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? "bg-white/20" : "bg-yellow-500 text-black"}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "inventory" && <MyInventoryTab />}
      {activeTab === "orders" && <BranchOrdersTab />}
      {activeTab === "branches" && <BranchInventoryTab />}
    </div>
  );
};

export default ProductCatalogManager;
