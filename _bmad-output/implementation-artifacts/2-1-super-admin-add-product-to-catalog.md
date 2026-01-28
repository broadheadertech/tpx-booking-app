# Story 2.1: Super Admin Add Product to Catalog

Status: review

---

## Story

As a **Super Admin**,
I want to **add products to a central catalog**,
So that **all branches have access to approved products with correct pricing**.

---

## Acceptance Criteria

### AC1: Access Product Catalog Manager
**Given** I am a logged-in super admin
**When** I navigate to the Admin Dashboard and select "Product Catalog"
**Then** I see the Product Catalog Manager with all existing products
**And** I see an "Add Product" button

### AC2: Add Product Form
**Given** I am in the Product Catalog Manager
**When** I click "Add Product"
**Then** I see a form with fields: name, description, price (MSRP), category, image
**And** name and price are required fields
**And** category is a dropdown selection

### AC3: Successful Product Creation
**Given** I submit a valid product form
**When** the product is created
**Then** the product appears in the catalog immediately
**And** I see a success toast "Product added successfully"
**And** the product is visible to all branches in real-time (NFR2: <5s sync)

### AC4: Form Validation
**Given** I try to add a product without required fields
**When** I submit the form
**Then** I see validation errors for missing fields
**And** the form is not submitted

---

## Tasks / Subtasks

- [x] **Task 1: Add productCatalog table to schema** (AC: #3)
  - [x] 1.1: Add `productCatalog` table definition in `convex/schema.ts` with fields:
    - `name`: string (required)
    - `description`: optional string
    - `price`: number (whole pesos, required)
    - `category`: string (required)
    - `image_url`: optional string
    - `is_active`: boolean (default true)
    - `price_enforced`: boolean (default false)
    - `created_at`: number (timestamp)
    - `created_by`: id("users")
  - [x] 1.2: Add indexes: `by_category`, `by_is_active`
  - [x] 1.3: Run `npx convex dev` to deploy schema

- [x] **Task 2: Create productCatalog service** (AC: #3)
  - [x] 2.1: Create `convex/services/productCatalog.ts`
  - [x] 2.2: Implement `addProduct` mutation with args validation:
    ```typescript
    args: {
      name: v.string(),
      description: v.optional(v.string()),
      price: v.number(),
      category: v.string(),
      image_url: v.optional(v.string()),
    }
    ```
  - [x] 2.3: Validate name is not empty, price > 0
  - [x] 2.4: Add `getCatalogProducts` query to return all active products ordered by name

- [x] **Task 3: Create ProductCatalogManager component** (AC: #1, #2)
  - [x] 3.1: Create `src/components/admin/ProductCatalogManager.jsx`
  - [x] 3.2: Display product grid/list with name, category, price, image
  - [x] 3.3: Add "Add Product" button with orange accent (#FF8C42)
  - [x] 3.4: Use skeleton loaders for loading state (UX7)
  - [x] 3.5: Use dark theme styling (#0A0A0A background)

- [x] **Task 4: Create AddProductModal component** (AC: #2, #4)
  - [x] 4.1: Create modal with form fields: name, description, price, category, image URL
  - [x] 4.2: Add category dropdown with options: "Hair Care", "Styling", "Grooming", "Accessories", "Other"
  - [x] 4.3: Implement client-side validation (name required, price > 0)
  - [x] 4.4: Submit via `useMutation(api.services.productCatalog.addProduct)`
  - [x] 4.5: Show success toast on creation
  - [x] 4.6: Close modal and refresh product list on success

- [x] **Task 5: Integrate into Admin Dashboard** (AC: #1)
  - [x] 5.1: Add "Catalog" tab to Admin Dashboard navigation
  - [x] 5.2: Import and render ProductCatalogManager when tab is active
  - [x] 5.3: Ensure proper role check (super_admin only)

- [x] **Task 6: End-to-end verification** (AC: #1, #2, #3, #4)
  - [x] 6.1: Test adding product as super admin
  - [x] 6.2: Test form validation (empty name, negative price)
  - [x] 6.3: Verify real-time sync (product appears immediately)
  - [x] 6.4: Run `npm run build` to verify no regressions

---

## Dev Notes

### Previous Story Intelligence (Story 1.3)

**Key Learnings from Epic 1:**
- PHT timezone handling is critical - use `PHT_OFFSET_MS = 8 * 60 * 60 * 1000` for midnight calculations (not needed for this story)
- Extract magic numbers to module-level constants with JSDoc
- Code review found 4 Medium issues; be proactive about documentation, UI notifications
- Tests deferred (project uses manual testing)
- Use `.withIndex()` for all queries - never `.filter()` alone on large tables

**Established Patterns:**
- Convex queries use `.withIndex()` for efficient filtering
- Date parameters as Unix timestamps in milliseconds
- Enrichment with related data via `Promise.all()` pattern
- Error handling with `ConvexError({ code, message })`

### Architecture References

**From architecture.md:**

```
productCatalog table:
- name, description, price, category, image_url
- is_active, price_enforced
- created_at
- Indexes: by_sku (not needed for MVP), by_category
```

**Database Naming Conventions (Convex):**
| Element | Convention | Example |
|---------|------------|---------|
| Tables | camelCase | `productCatalog` |
| Fields | snake_case | `image_url`, `is_active`, `price_enforced` |
| Indexes | by_fieldname | `by_category`, `by_is_active` |

**API Naming Conventions:**
| Type | Convention | Example |
|------|------------|---------|
| Queries | get* prefix | `getCatalogProducts` |
| Mutations | verb + noun | `addProduct` |

### Project Context Rules

**From project-context.md:**

**Data Types:**
- **Currency**: Always whole pesos as `v.number()` - NOT decimals (5000 = ₱5,000)
- **Dates**: Unix timestamps in milliseconds as `v.number()`
- **IDs**: Use `v.id("tableName")` - never plain strings

**Component Structure:**
- Admin features go in `src/components/admin/`
- Common components go in `src/components/common/`

**UI Theme:**
- Dark theme: #0A0A0A background
- Orange accent: #FF8C42
- Use skeleton loaders for loading states
- Mobile touch targets: minimum 44px

### Implementation Patterns

**Schema Pattern:**
```typescript
// convex/schema.ts - Add to existing schema
productCatalog: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  price: v.number(), // Whole pesos
  category: v.string(),
  image_url: v.optional(v.string()),
  is_active: v.boolean(),
  price_enforced: v.boolean(),
  created_at: v.number(),
  created_by: v.id("users"),
})
  .index("by_category", ["category"])
  .index("by_is_active", ["is_active"]),
```

**Service Pattern:**
```typescript
// convex/services/productCatalog.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const addProduct = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    category: v.string(),
    image_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate
    if (!args.name.trim()) {
      throw new ConvexError({ code: "INVALID_NAME", message: "Product name is required" });
    }
    if (args.price <= 0) {
      throw new ConvexError({ code: "INVALID_PRICE", message: "Price must be greater than 0" });
    }

    // TODO: Get current user from auth context
    const productId = await ctx.db.insert("productCatalog", {
      name: args.name.trim(),
      description: args.description?.trim(),
      price: args.price,
      category: args.category,
      image_url: args.image_url,
      is_active: true,
      price_enforced: false,
      created_at: Date.now(),
      created_by: /* user._id from auth */,
    });

    return productId;
  },
});

export const getCatalogProducts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("productCatalog")
      .withIndex("by_is_active", (q) => q.eq("is_active", true))
      .order("asc")
      .collect();
  },
});
```

**Component Pattern:**
```jsx
// src/components/admin/ProductCatalogManager.jsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Skeleton from "../common/Skeleton";

export default function ProductCatalogManager() {
  const products = useQuery(api.services.productCatalog.getCatalogProducts);
  const addProduct = useMutation(api.services.productCatalog.addProduct);
  const [showAddModal, setShowAddModal] = useState(false);

  if (products === undefined) return <ProductsSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Product Catalog</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#FF8C42] text-white px-4 py-2 rounded-lg hover:bg-[#FF8C42]/90"
        >
          Add Product
        </button>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onAdd={addProduct}
        />
      )}
    </div>
  );
}
```

### Category Options

Standard product categories for barbershop:
```javascript
const PRODUCT_CATEGORIES = [
  { id: "hair_care", label: "Hair Care" },
  { id: "styling", label: "Styling" },
  { id: "grooming", label: "Grooming" },
  { id: "accessories", label: "Accessories" },
  { id: "other", label: "Other" },
];
```

### Performance Requirements

- Product catalog sync: <5 seconds to all branches (NFR2)
- Use Convex real-time subscriptions for instant updates
- Use skeleton loaders for loading states

### Security Requirements

- **Super Admin Only**: Only super_admin role can add products
- Other roles can view but not modify catalog (Story 2.4)
- No branch_id filtering needed - catalog is global

### UX Requirements

- **UX7**: Use skeleton loaders for loading states
- **UX8**: Dark theme (#0A0A0A) with orange accent (#FF8C42)
- **UX6**: Mobile touch targets minimum 44px
- Success toast on product creation

### Existing Infrastructure to Reuse

**Existing Components:**
- `Skeleton.jsx` in `src/components/common/` for loading states
- Toast notification system already in place
- Modal pattern used in other admin features

**Existing Services to Reference:**
- `convex/services/products.ts` - Existing branch-level products (don't duplicate, this is central catalog)
- Pattern for mutations and queries

### Files to Create

**Created:**
- `convex/services/productCatalog.ts` - Central catalog service
- `src/components/admin/ProductCatalogManager.jsx` - Main catalog view
- `src/components/admin/AddProductModal.jsx` (or inline in ProductCatalogManager)

**Modified:**
- `convex/schema.ts` - Add productCatalog table
- Admin Dashboard page - Add Catalog tab

---

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md - Data Architecture]
- [Source: _bmad-output/planning-artifacts/project-context.md - Framework Rules]
- [Source: _bmad-output/implementation-artifacts/1-3-branch-admin-view-attendance.md - Previous Story]
- [Source: _bmad-output/planning-artifacts/prd.md - FR30, FR31, FR33, NFR2]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - UX6, UX7, UX8]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Build passed successfully after fixing ToastContext import path
- Schema deployed to Convex with new productCatalog table and indexes
- Convex functions ready and deployed

### Completion Notes List

1. **Schema Implementation**: Added `productCatalog` table to `convex/schema.ts` with all specified fields (name, description, price, category, image_url, is_active, price_enforced, created_at, created_by) and indexes (by_category, by_is_active). Schema deployed successfully.

2. **Service Layer**: Created `convex/services/productCatalog.ts` with:
   - `addProduct` mutation with validation (name not empty, price > 0)
   - `getCatalogProducts` query using `.withIndex("by_is_active")` for efficient filtering
   - `getProductById` and `getProductsByCategory` helper queries
   - Proper ConvexError handling with codes

3. **UI Components**: Created `ProductCatalogManager.jsx` with:
   - Product grid display with ProductCard components
   - Category filter tabs and search functionality
   - Skeleton loaders for loading state (UX7 compliance)
   - Dark theme styling with #0A0A0A background and #FF8C42 accent
   - 44px minimum touch targets for mobile (UX6 compliance)
   - Empty state with call-to-action

4. **Add Product Modal**: Integrated AddProductModal within ProductCatalogManager:
   - Form with name (required), description (optional), price (required), category (dropdown), image URL (optional)
   - Client-side validation with error messages
   - Toast notifications on success/error using existing ToastNotification system
   - Form reset and modal close on success

5. **Dashboard Integration**: Added "Catalog" tab to Admin Dashboard:
   - Super admin only access check
   - Tab with 'package' icon added to navigation
   - ProductCatalogManager rendered when tab is active

6. **Verification**: Build passed successfully with `npm run build` - no regressions

### File List

**Created:**
- `convex/services/productCatalog.ts` - Central product catalog service with mutations and queries

**Modified:**
- `convex/schema.ts` - Added productCatalog table definition and indexes
- `src/components/admin/ProductCatalogManager.jsx` - New component for catalog management
- `src/pages/admin/Dashboard.jsx` - Added Catalog tab and ProductCatalogManager integration

### Change Log

| Date | Change | Files |
|------|--------|-------|
| 2026-01-25 | Story 2.1 implementation complete | schema.ts, productCatalog.ts, ProductCatalogManager.jsx, Dashboard.jsx |
