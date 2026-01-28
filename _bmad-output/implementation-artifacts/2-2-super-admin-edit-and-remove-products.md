# Story 2.2: Super Admin Edit and Remove Products

Status: done

---

## Story

As a **Super Admin**,
I want to **edit or remove products from the catalog**,
So that **I can keep the product list accurate and up-to-date**.

---

## Acceptance Criteria

### AC1: Edit Product Details
**Given** I am viewing the product catalog
**When** I click on a product's edit button
**Then** I can edit its details (name, description, price, category, image, stock settings)
**And** changes sync to all branches in real-time (via Convex)

### AC2: Soft Delete Product
**Given** I want to remove a product
**When** I click "Delete" and confirm the action
**Then** the product is soft-deleted (marked inactive via is_active = false)
**And** branches no longer see this product in the catalog

### AC3: Price Enforcement Toggle (Story 2.3 combined)
**Given** I am editing a product
**When** I toggle "Enforce MSRP" on
**Then** branches cannot modify the price for this product
**And** the setting is saved and visible to branches

---

## Tasks / Subtasks

- [x] **Task 1: Backend mutations already implemented**
  - [x] 1.1: `updateProduct` mutation exists in `convex/services/productCatalog.ts`
  - [x] 1.2: `deleteProduct` mutation exists (soft-delete via is_active = false)
  - [x] 1.3: `price_enforced` field exists in schema and updateProduct

- [x] **Task 2: Add Edit button to product cards**
  - [x] 2.1: Add Edit (pencil) icon button to InventoryProductCard component
  - [x] 2.2: Pass onEdit handler prop to card component

- [x] **Task 3: Create EditProductModal component**
  - [x] 3.1: Create modal similar to AddProductModal but pre-filled with product data
  - [x] 3.2: Add price enforcement toggle switch
  - [x] 3.3: Wire up useMutation for updateProduct
  - [x] 3.4: Show success toast on update

- [x] **Task 4: Add Delete button with confirmation**
  - [x] 4.1: Add Delete (trash) icon button to InventoryProductCard
  - [x] 4.2: Show confirmation dialog before deleting
  - [x] 4.3: Wire up useMutation for deleteProduct
  - [x] 4.4: Show success toast on delete

- [x] **Task 5: Verification**
  - [x] 5.1: Test editing product - changes appear immediately
  - [x] 5.2: Test deleting product - removed from list
  - [x] 5.3: Verify branches no longer see deleted products
  - [x] 5.4: Run `npm run build` to verify no regressions

---

## Dev Notes

### Existing Backend (Already Implemented)

**File: convex/services/productCatalog.ts**

```typescript
// updateProduct - lines 122-188
export const updateProduct = mutation({
  args: {
    product_id: v.id("productCatalog"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    cost: v.optional(v.number()),
    category: v.optional(v.string()),
    brand: v.optional(v.string()),
    sku: v.optional(v.string()),
    image_url: v.optional(v.string()),
    image_storage_id: v.optional(v.id("_storage")),
    minStock: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
    price_enforced: v.optional(v.boolean()),
  },
  // ... handler validates and patches product
});

// deleteProduct - lines 193-208 (soft delete)
export const deleteProduct = mutation({
  args: { product_id: v.id("productCatalog") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.product_id, { is_active: false });
    return { success: true };
  },
});
```

### UI Changes Required

**File: src/components/admin/ProductCatalogManager.jsx**

1. Add Edit and Delete buttons to `InventoryProductCard`
2. Create `EditProductModal` component (similar to AddProductModal)
3. Add confirmation dialog for delete
4. Wire up mutations

---

## Technical Guidance

### Patterns to Follow (from Story 2.1)
- Use existing Modal component with `variant="dark"`
- Use toast notifications for success/error feedback
- Follow dark theme styling (#0A0A0A background, #FF8C42 accent)
- Use Lucide icons (Edit2, Trash2)

### Price Enforcement Toggle
```jsx
<div className="flex items-center justify-between">
  <div>
    <label className="text-sm font-medium text-gray-400">Enforce MSRP</label>
    <p className="text-xs text-gray-500">Branches cannot change this price</p>
  </div>
  <button
    type="button"
    onClick={() => handleChange("price_enforced", !formData.price_enforced)}
    className={`relative w-12 h-6 rounded-full transition-colors ${
      formData.price_enforced ? "bg-[#FF8C42]" : "bg-[#333333]"
    }`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
      formData.price_enforced ? "translate-x-6" : ""
    }`} />
  </button>
</div>
```

---

## File List

**Modified:**
- `src/components/admin/ProductCatalogManager.jsx` - Add edit/delete to cards, create EditProductModal

---

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes

1. **Edit Functionality**: Added `EditProductModal` component that pre-fills form with existing product data. Includes all editable fields (name, brand, SKU, category, price, cost, minStock, description) plus image upload.

2. **Delete Functionality**: Added `DeleteConfirmModal` with confirmation dialog. Uses soft-delete (`is_active: false`) as per spec. Product disappears from catalog immediately via Convex real-time sync.

3. **Price Enforcement Toggle**: Added toggle switch in EditProductModal for `price_enforced` field. When enabled, shows lock icon on product card. Branches cannot modify enforced prices.

4. **UI Enhancements**:
   - Edit/Delete buttons appear on hover over product cards
   - Lock icon shows on products with price enforcement
   - Toast notifications for success/error feedback

5. **Stories 2.3 and 2.4**: Combined into this implementation:
   - Story 2.3 (Price Enforcement Toggle) - Toggle added to EditProductModal
   - Story 2.4 (Branch Staff View Catalog) - Already covered by BranchProductOrdering component

### File List

**Modified:**
- `src/components/admin/ProductCatalogManager.jsx` - Added EditProductModal, DeleteConfirmModal, updated InventoryProductCard

---

## Change Log

| Date | Change | Files |
|------|--------|-------|
| 2026-01-25 | Story 2.2 created | 2-2-super-admin-edit-and-remove-products.md |
| 2026-01-25 | Story 2.2 implementation complete | ProductCatalogManager.jsx |
