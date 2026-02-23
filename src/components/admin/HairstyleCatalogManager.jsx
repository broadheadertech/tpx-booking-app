import React, { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  X,
  Search,
  Filter,
  Image,
  Sliders,
  Tag,
  Star,
  Eye,
  EyeOff,
  RefreshCw,
  Scissors,
  ChevronDown,
  BarChart3,
  Heart,
  Users,
} from "lucide-react";
import Skeleton from "../common/Skeleton";
import Modal from "../common/Modal";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useToast } from "../common/ToastNotification";

/**
 * Hairstyle categories for the AI Mirror feature
 */
const CATEGORIES = [
  { id: "fade", label: "Fade", color: "blue" },
  { id: "undercut", label: "Undercut", color: "purple" },
  { id: "classic", label: "Classic", color: "amber" },
  { id: "modern", label: "Modern", color: "green" },
  { id: "long", label: "Long", color: "pink" },
  { id: "buzz", label: "Buzz", color: "red" },
  { id: "textured", label: "Textured", color: "teal" },
];

const FACE_SHAPES = ["oval", "round", "square", "heart", "diamond", "oblong"];

const MAINTENANCE_LEVELS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

/**
 * Color map for category badges
 */
const CATEGORY_COLORS = {
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  pink: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
  teal: "bg-teal-500/20 text-teal-400 border-teal-500/30",
};

/**
 * Get category config by id
 */
const getCategoryConfig = (categoryId) => {
  return CATEGORIES.find((c) => c.id === categoryId) || { id: categoryId, label: categoryId, color: "blue" };
};

/**
 * Category Badge Component
 */
const CategoryBadge = ({ categoryId }) => {
  const cat = getCategoryConfig(categoryId);
  const colorClass = CATEGORY_COLORS[cat.color] || CATEGORY_COLORS.blue;
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colorClass} capitalize`}>
      {cat.label}
    </span>
  );
};

/**
 * Maintenance Level Badge
 */
const MaintenanceBadge = ({ level }) => {
  const styles = {
    low: "bg-green-500/20 text-green-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    high: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[level] || styles.medium} capitalize`}>
      {level}
    </span>
  );
};

/**
 * Mini Face Shape Score Bars
 */
const FaceShapeScores = ({ scores = {} }) => {
  return (
    <div className="flex items-end gap-0.5 h-6">
      {FACE_SHAPES.map((shape) => {
        const value = scores[shape] || 0;
        const height = Math.max((value / 100) * 24, 2);
        return (
          <div key={shape} className="flex flex-col items-center" title={`${shape}: ${value}%`}>
            <div
              className="w-3 rounded-t-sm transition-all"
              style={{
                height: `${height}px`,
                backgroundColor: value >= 70 ? "#22c55e" : value >= 40 ? "#eab308" : "#6b7280",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

/**
 * Hairstyle Card Component for grid view
 */
const HairstyleCard = ({ hairstyle, onEdit, onDelete, onToggleActive }) => {
  const imageUrl = hairstyle.resolvedThumbnailUrl || hairstyle.resolvedOverlayUrl;

  return (
    <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl overflow-hidden hover:border-white/20 transition-colors group">
      {/* Image */}
      <div className="aspect-square bg-[#111111] relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={hairstyle.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center ${imageUrl ? "hidden" : ""}`}>
          <Scissors className="w-16 h-16 text-gray-600" />
        </div>

        {/* Status + Category overlay */}
        <div className="absolute top-2 left-2 flex gap-1">
          <CategoryBadge categoryId={hairstyle.category} />
        </div>
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(hairstyle);
            }}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              hairstyle.isActive
                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
            }`}
            title={hairstyle.isActive ? "Active - click to deactivate" : "Inactive - click to activate"}
          >
            {hairstyle.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        {/* Edit/Delete overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onEdit(hairstyle)}
            className="p-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors text-white"
            title="Edit Hairstyle"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(hairstyle)}
            className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors text-white"
            title="Delete Hairstyle"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-white font-semibold line-clamp-1">{hairstyle.name}</h3>
          {hairstyle.description && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{hairstyle.description}</p>
          )}
        </div>

        {/* Face shape scores mini chart */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Face Shape Match</p>
          <FaceShapeScores scores={hairstyle.faceShapeScores} />
          <div className="flex gap-0.5 mt-0.5">
            {FACE_SHAPES.map((shape) => (
              <span key={shape} className="text-[8px] text-gray-600 w-3 text-center capitalize">
                {shape.slice(0, 2)}
              </span>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-2 border-t border-[#333333]">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1" title="Try count">
              <Users className="w-3 h-3" /> {hairstyle.tryCount || 0}
            </span>
            <span className="flex items-center gap-1" title="Save count">
              <Heart className="w-3 h-3" /> {hairstyle.saveCount || 0}
            </span>
          </div>
          <MaintenanceBadge level={hairstyle.maintenanceLevel || "medium"} />
        </div>

        {/* Tags */}
        {hairstyle.tags && hairstyle.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hairstyle.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="px-1.5 py-0.5 bg-[#111111] text-gray-500 text-[10px] rounded-md">
                {tag}
              </span>
            ))}
            {hairstyle.tags.length > 3 && (
              <span className="px-1.5 py-0.5 text-gray-600 text-[10px]">+{hairstyle.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Loading Skeleton for hairstyle grid
 */
const HairstylesSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-[#1A1A1A] border border-[#333333] rounded-xl overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Image Upload Section (shared between Add and Edit modals)
 */
const ImageUploadField = ({ label, icon: Icon, imagePreview, onImageSelect, onRemoveImage, fileInputRef, error }) => {
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
        {label}
      </h4>
      {imagePreview ? (
        <div className="relative group bg-[#1A1A1A] rounded-xl overflow-hidden border border-[#333333]">
          <img src={imagePreview} alt="Preview" className="w-full h-28 object-cover" />
          <div className="absolute inset-0 bg-transparent group-hover:bg-black/50 transition-all flex items-center justify-center">
            <button
              type="button"
              onClick={onRemoveImage}
              className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-28 border-2 border-dashed border-[#444444] rounded-xl flex flex-col items-center justify-center bg-[#1A1A1A] hover:border-[var(--color-primary)]/50 cursor-pointer transition-colors"
        >
          <Upload className="w-5 h-5 text-[var(--color-primary)] mb-1" />
          <p className="text-xs text-gray-400">Click or drag to upload</p>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onImageSelect} className="hidden" />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};

/**
 * Tag/Chip Input Component
 */
const TagInput = ({ tags, onChange }) => {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue("");
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-[#111111] border border-[#333333] rounded-lg px-3 py-2 min-h-[40px]">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs rounded-full"
        >
          {tag}
          <button type="button" onClick={() => removeTag(index)} className="hover:text-white transition-colors">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? "Type and press Enter..." : ""}
        className="flex-1 min-w-[80px] bg-transparent text-white text-sm outline-none placeholder-gray-600"
      />
    </div>
  );
};

/**
 * Face Shape Score Sliders
 */
const FaceShapeSliders = ({ scores, onChange }) => {
  const handleChange = (shape, value) => {
    onChange({ ...scores, [shape]: parseInt(value, 10) });
  };

  return (
    <div className="space-y-3">
      {FACE_SHAPES.map((shape) => {
        const value = scores[shape] || 0;
        return (
          <div key={shape} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 capitalize">{shape}</span>
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => handleChange(shape, e.target.value)}
                className="w-full h-2 bg-[#333333] rounded-full appearance-none cursor-pointer accent-[var(--color-primary)]"
                style={{
                  background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${value}%, #333333 ${value}%, #333333 100%)`,
                }}
              />
            </div>
            <span className="text-xs text-white font-mono w-8 text-right">{value}</span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Add Hairstyle Modal
 */
const AddHairstyleModal = ({ isOpen, onClose }) => {
  const { user } = useCurrentUser();
  const toast = useToast();
  const addHairstyle = useMutation(api.services.hairstyleCatalogAdmin.addHairstyle);
  const generateUploadUrl = useMutation(api.services.aiMirror.generateUploadUrl);
  const overlayInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "fade",
    description: "",
    maintenanceLevel: "medium",
    isActive: true,
  });
  const [faceShapeScores, setFaceShapeScores] = useState({
    oval: 50,
    round: 50,
    square: 50,
    heart: 50,
    diamond: 50,
    oblong: 50,
  });
  const [tags, setTags] = useState([]);
  const [overlayImage, setOverlayImage] = useState(null);
  const [overlayPreview, setOverlayPreview] = useState("");
  const [thumbnailImage, setThumbnailImage] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Hairstyle name is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!overlayImage) newErrors.overlay = "Overlay image is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageSelect = (file, type) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [type]: "Image must be under 5MB" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, [type]: "Please select a valid image" }));
      return;
    }

    if (type === "overlay") {
      setOverlayImage(file);
      setErrors((prev) => ({ ...prev, overlay: undefined }));
    } else {
      setThumbnailImage(file);
      setErrors((prev) => ({ ...prev, thumbnail: undefined }));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        if (type === "overlay") setOverlayPreview(e.target.result);
        else setThumbnailPreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (file) => {
    if (!file) return null;
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Failed to upload image");
      const { storageId } = await result.json();
      return storageId;
    } catch (err) {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!user) return;

    setIsSubmitting(true);
    try {
      const overlayStorageId = await handleImageUpload(overlayImage);
      if (!overlayStorageId) {
        setErrors((prev) => ({ ...prev, overlay: "Failed to upload overlay image" }));
        setIsSubmitting(false);
        return;
      }

      let thumbnailStorageId = null;
      if (thumbnailImage) {
        thumbnailStorageId = await handleImageUpload(thumbnailImage);
      }

      await addHairstyle({
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim() || undefined,
        overlayStorageId,
        thumbnailStorageId: thumbnailStorageId || undefined,
        faceShapeScores,
        maintenanceLevel: formData.maintenanceLevel,
        tags: tags.length > 0 ? tags : undefined,
        isActive: formData.isActive,
      });

      toast.success("Success", "Hairstyle added to catalog");
      handleCloseModal();
    } catch (err) {
      toast.error("Error", err.message || "Failed to add hairstyle");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setFormData({ name: "", category: "fade", description: "", maintenanceLevel: "medium", isActive: true });
    setFaceShapeScores({ oval: 50, round: 50, square: 50, heart: 50, diamond: 50, oblong: 50 });
    setTags([]);
    setOverlayImage(null);
    setOverlayPreview("");
    setThumbnailImage(null);
    setThumbnailPreview("");
    setErrors({});
    if (overlayInputRef.current) overlayInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCloseModal} title="Add Hairstyle" size="lg" variant="dark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image Uploads */}
        <div className="bg-[#252525] rounded-xl p-4 border border-[#333333]">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Image className="w-4 h-4 text-[var(--color-primary)]" />
            Hairstyle Images
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <ImageUploadField
              label="Overlay Image *"
              icon={Image}
              imagePreview={overlayPreview}
              onImageSelect={(e) => handleImageSelect(e.target.files?.[0], "overlay")}
              onRemoveImage={() => {
                setOverlayImage(null);
                setOverlayPreview("");
                if (overlayInputRef.current) overlayInputRef.current.value = "";
              }}
              fileInputRef={overlayInputRef}
              error={errors.overlay}
            />
            <ImageUploadField
              label="Thumbnail (optional)"
              icon={Image}
              imagePreview={thumbnailPreview}
              onImageSelect={(e) => handleImageSelect(e.target.files?.[0], "thumbnail")}
              onRemoveImage={() => {
                setThumbnailImage(null);
                setThumbnailPreview("");
                if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
              }}
              fileInputRef={thumbnailInputRef}
              error={errors.thumbnail}
            />
          </div>
        </div>

        {/* Name and Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Low Fade Pompadour"
              className={`w-full bg-[#111111] border ${errors.name ? "border-red-500" : "border-[#333333]"} text-white rounded-lg px-3 py-2 text-sm`}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={2}
            placeholder="Describe the hairstyle..."
            className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        {/* Face Shape Scores */}
        <div className="bg-[#252525] rounded-xl p-4 border border-[#333333]">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--color-primary)]" />
            Face Shape Compatibility (0-100)
          </h3>
          <FaceShapeSliders scores={faceShapeScores} onChange={setFaceShapeScores} />
        </div>

        {/* Maintenance Level and Active Toggle */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Maintenance Level</label>
            <select
              value={formData.maintenanceLevel}
              onChange={(e) => handleChange("maintenanceLevel", e.target.value)}
              className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm"
            >
              {MAINTENANCE_LEVELS.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
            <button
              type="button"
              onClick={() => handleChange("isActive", !formData.isActive)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                formData.isActive
                  ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                  : "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30"
              }`}
            >
              {formData.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {formData.isActive ? "Active" : "Inactive"}
            </button>
          </div>
        </div>

        {/* Style Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Style Tags
          </label>
          <TagInput tags={tags} onChange={setTags} />
          <p className="text-xs text-gray-600 mt-1">Press Enter or comma to add a tag</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#333333]">
          <button
            type="button"
            onClick={handleCloseModal}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add Hairstyle
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Edit Hairstyle Modal
 */
const EditHairstyleModal = ({ isOpen, onClose, hairstyle }) => {
  const { user } = useCurrentUser();
  const toast = useToast();
  const updateHairstyle = useMutation(api.services.hairstyleCatalogAdmin.updateHairstyle);
  const generateUploadUrl = useMutation(api.services.aiMirror.generateUploadUrl);
  const overlayInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "fade",
    description: "",
    maintenanceLevel: "medium",
    isActive: true,
  });
  const [faceShapeScores, setFaceShapeScores] = useState({
    oval: 50,
    round: 50,
    square: 50,
    heart: 50,
    diamond: 50,
    oblong: 50,
  });
  const [tags, setTags] = useState([]);
  const [overlayImage, setOverlayImage] = useState(null);
  const [overlayPreview, setOverlayPreview] = useState("");
  const [thumbnailImage, setThumbnailImage] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when hairstyle changes
  React.useEffect(() => {
    if (hairstyle && isOpen) {
      setFormData({
        name: hairstyle.name || "",
        category: hairstyle.category || "fade",
        description: hairstyle.description || "",
        maintenanceLevel: hairstyle.maintenanceLevel || "medium",
        isActive: hairstyle.isActive !== false,
      });
      setFaceShapeScores({
        oval: hairstyle.faceShapeScores?.oval ?? 50,
        round: hairstyle.faceShapeScores?.round ?? 50,
        square: hairstyle.faceShapeScores?.square ?? 50,
        heart: hairstyle.faceShapeScores?.heart ?? 50,
        diamond: hairstyle.faceShapeScores?.diamond ?? 50,
        oblong: hairstyle.faceShapeScores?.oblong ?? 50,
      });
      setTags(hairstyle.tags || []);
      setOverlayPreview(hairstyle.resolvedOverlayUrl || "");
      setThumbnailPreview(hairstyle.resolvedThumbnailUrl || "");
      setOverlayImage(null);
      setThumbnailImage(null);
      setErrors({});
    }
  }, [hairstyle, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Hairstyle name is required";
    if (!formData.category) newErrors.category = "Category is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageSelect = (file, type) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [type]: "Image must be under 5MB" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, [type]: "Please select a valid image" }));
      return;
    }

    if (type === "overlay") {
      setOverlayImage(file);
      setErrors((prev) => ({ ...prev, overlay: undefined }));
    } else {
      setThumbnailImage(file);
      setErrors((prev) => ({ ...prev, thumbnail: undefined }));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        if (type === "overlay") setOverlayPreview(e.target.result);
        else setThumbnailPreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (file) => {
    if (!file) return null;
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Failed to upload image");
      const { storageId } = await result.json();
      return storageId;
    } catch (err) {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!user || !hairstyle) return;

    setIsSubmitting(true);
    try {
      let overlayStorageId = undefined;
      if (overlayImage) {
        overlayStorageId = await handleImageUpload(overlayImage);
        if (!overlayStorageId) {
          setErrors((prev) => ({ ...prev, overlay: "Failed to upload overlay image" }));
          setIsSubmitting(false);
          return;
        }
      }

      let thumbnailStorageId = undefined;
      if (thumbnailImage) {
        thumbnailStorageId = await handleImageUpload(thumbnailImage);
        if (!thumbnailStorageId) {
          setErrors((prev) => ({ ...prev, thumbnail: "Failed to upload thumbnail" }));
          setIsSubmitting(false);
          return;
        }
      }

      await updateHairstyle({
        hairstyleId: hairstyle._id,
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim() || undefined,
        overlayStorageId,
        thumbnailStorageId,
        faceShapeScores,
        maintenanceLevel: formData.maintenanceLevel,
        tags: tags.length > 0 ? tags : undefined,
        isActive: formData.isActive,
      });

      toast.success("Success", "Hairstyle updated successfully");
      handleCloseModal();
    } catch (err) {
      toast.error("Error", err.message || "Failed to update hairstyle");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setErrors({});
    setOverlayImage(null);
    setThumbnailImage(null);
    if (overlayInputRef.current) overlayInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (!hairstyle) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleCloseModal} title={`Edit: ${hairstyle.name}`} size="lg" variant="dark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image Uploads */}
        <div className="bg-[#252525] rounded-xl p-4 border border-[#333333]">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Image className="w-4 h-4 text-[var(--color-primary)]" />
            Hairstyle Images
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <ImageUploadField
              label="Overlay Image"
              icon={Image}
              imagePreview={overlayPreview}
              onImageSelect={(e) => handleImageSelect(e.target.files?.[0], "overlay")}
              onRemoveImage={() => {
                setOverlayImage(null);
                setOverlayPreview("");
                if (overlayInputRef.current) overlayInputRef.current.value = "";
              }}
              fileInputRef={overlayInputRef}
              error={errors.overlay}
            />
            <ImageUploadField
              label="Thumbnail (optional)"
              icon={Image}
              imagePreview={thumbnailPreview}
              onImageSelect={(e) => handleImageSelect(e.target.files?.[0], "thumbnail")}
              onRemoveImage={() => {
                setThumbnailImage(null);
                setThumbnailPreview("");
                if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
              }}
              fileInputRef={thumbnailInputRef}
              error={errors.thumbnail}
            />
          </div>
        </div>

        {/* Name and Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={`w-full bg-[#111111] border ${errors.name ? "border-red-500" : "border-[#333333]"} text-white rounded-lg px-3 py-2 text-sm`}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={2}
            className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        {/* Face Shape Scores */}
        <div className="bg-[#252525] rounded-xl p-4 border border-[#333333]">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--color-primary)]" />
            Face Shape Compatibility (0-100)
          </h3>
          <FaceShapeSliders scores={faceShapeScores} onChange={setFaceShapeScores} />
        </div>

        {/* Maintenance Level and Active Toggle */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Maintenance Level</label>
            <select
              value={formData.maintenanceLevel}
              onChange={(e) => handleChange("maintenanceLevel", e.target.value)}
              className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm"
            >
              {MAINTENANCE_LEVELS.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
            <button
              type="button"
              onClick={() => handleChange("isActive", !formData.isActive)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                formData.isActive
                  ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                  : "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30"
              }`}
            >
              {formData.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {formData.isActive ? "Active" : "Inactive"}
            </button>
          </div>
        </div>

        {/* Style Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Style Tags
          </label>
          <TagInput tags={tags} onChange={setTags} />
          <p className="text-xs text-gray-600 mt-1">Press Enter or comma to add a tag</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#333333]">
          <button
            type="button"
            onClick={handleCloseModal}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Delete Confirmation Modal
 */
const DeleteConfirmModal = ({ isOpen, onClose, hairstyle, onConfirm, isDeleting }) => {
  if (!hairstyle) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Hairstyle" size="sm" variant="dark">
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to delete <span className="text-white font-semibold">{hairstyle.name}</span>? This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(hairstyle._id)}
            disabled={isDeleting}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Delete
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/**
 * Summary stat card
 */
const StatCard = ({ icon: Icon, label, value, color = "primary" }) => {
  const colorMap = {
    primary: "bg-[var(--color-primary)]/20 text-[var(--color-primary)]",
    green: "bg-green-500/20 text-green-400",
    yellow: "bg-yellow-500/20 text-yellow-400",
    blue: "bg-blue-500/20 text-blue-400",
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-white font-bold text-xl">{value}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Main HairstyleCatalogManager Component
 */
const HairstyleCatalogManager = () => {
  const toast = useToast();
  const hairstyles = useQuery(api.services.hairstyleCatalogAdmin.getAllHairstyles);
  const deleteHairstyle = useMutation(api.services.hairstyleCatalogAdmin.deleteHairstyle);
  const updateHairstyle = useMutation(api.services.hairstyleCatalogAdmin.updateHairstyle);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHairstyle, setEditingHairstyle] = useState(null);
  const [deletingHairstyle, setDeletingHairstyle] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Derived data
  const isLoading = hairstyles === undefined;
  const allHairstyles = hairstyles || [];

  const filteredHairstyles = allHairstyles.filter((h) => {
    const matchesSearch = !searchQuery || h.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || h.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && h.isActive !== false) ||
      (statusFilter === "inactive" && h.isActive === false);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Stats
  const totalCount = allHairstyles.length;
  const activeCount = allHairstyles.filter((h) => h.isActive !== false).length;
  const totalTries = allHairstyles.reduce((sum, h) => sum + (h.tryCount || 0), 0);
  const totalSaves = allHairstyles.reduce((sum, h) => sum + (h.saveCount || 0), 0);

  // Handlers
  const handleToggleActive = useCallback(
    async (hairstyle) => {
      try {
        await updateHairstyle({
          hairstyleId: hairstyle._id,
          isActive: hairstyle.isActive === false ? true : false,
        });
        toast.success(
          "Updated",
          `${hairstyle.name} is now ${hairstyle.isActive === false ? "active" : "inactive"}`
        );
      } catch (err) {
        toast.error("Error", err.message || "Failed to update status");
      }
    },
    [updateHairstyle, toast]
  );

  const handleDelete = useCallback(
    async (hairstyleId) => {
      setIsDeleting(true);
      try {
        await deleteHairstyle({ hairstyleId });
        toast.success("Deleted", "Hairstyle removed from catalog");
        setDeletingHairstyle(null);
      } catch (err) {
        toast.error("Error", err.message || "Failed to delete hairstyle");
      } finally {
        setIsDeleting(false);
      }
    },
    [deleteHairstyle, toast]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Scissors className="w-6 h-6 text-[var(--color-primary)]" />
            Hairstyle Catalog
          </h2>
          <p className="text-gray-400 text-sm">Manage hairstyles for the AI Mirror feature</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary)]/90 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Hairstyle</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Scissors} label="Total Styles" value={totalCount} color="primary" />
        <StatCard icon={Eye} label="Active" value={activeCount} color="green" />
        <StatCard icon={Users} label="Total Tries" value={totalTries.toLocaleString()} color="blue" />
        <StatCard icon={Heart} label="Total Saves" value={totalSaves.toLocaleString()} color="yellow" />
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 space-y-3">
        <div className="flex gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hairstyles..."
              className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-[var(--color-primary)]/50 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              showFilters || categoryFilter !== "all" || statusFilter !== "all"
                ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30"
                : "bg-[#111111] text-gray-400 border-[#333333] hover:text-white"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(categoryFilter !== "all" || statusFilter !== "all") && (
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            )}
          </button>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="flex gap-3 pt-2 border-t border-[#333333]">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {(categoryFilter !== "all" || statusFilter !== "all") && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setCategoryFilter("all");
                    setStatusFilter("all");
                  }}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-gray-500">
          Showing {filteredHairstyles.length} of {totalCount} hairstyles
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <HairstylesSkeleton />
      ) : filteredHairstyles.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-12 text-center">
          <Scissors className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-1">
            {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
              ? "No hairstyles match your filters"
              : "No hairstyles yet"}
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Add your first hairstyle to get started with the AI Mirror"}
          </p>
          {!searchQuery && categoryFilter === "all" && statusFilter === "all" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Hairstyle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredHairstyles.map((hairstyle) => (
            <HairstyleCard
              key={hairstyle._id}
              hairstyle={hairstyle}
              onEdit={(h) => setEditingHairstyle(h)}
              onDelete={(h) => setDeletingHairstyle(h)}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddHairstyleModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <EditHairstyleModal
        isOpen={!!editingHairstyle}
        onClose={() => setEditingHairstyle(null)}
        hairstyle={editingHairstyle}
      />
      <DeleteConfirmModal
        isOpen={!!deletingHairstyle}
        onClose={() => setDeletingHairstyle(null)}
        hairstyle={deletingHairstyle}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default HairstyleCatalogManager;
