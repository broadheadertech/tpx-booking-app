---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Phase 3 Breakthrough: Shoppable Posts'
session_goals: 'In-feed product commerce - tag products in posts for direct purchase'
selected_approach: 'Deep-Dive Implementation'
techniques_used: ['Role Playing', 'Cross-Pollination', 'SCAMPER']
ideas_generated: 18
context_file: ''
session_active: false
workflow_completed: true
implementation_status: 'COMPLETED'
---

# Brainstorming Session: Phase 3 - Shoppable Posts

**Facilitator:** MASTERPAINTER
**Date:** 2026-02-04
**Status:** ✅ IMPLEMENTED

---

## Feature Vision

Enable in-feed product commerce where barbers can tag products used in their showcase posts, and customers can purchase directly from the feed without leaving the browsing experience.

---

## Implementation Summary

### Files Created/Modified

#### Backend (Convex)

| File | Description |
|------|-------------|
| `convex/schema.ts` | Added `tagged_products`, `is_shoppable`, `product_clicks`, `product_purchases` to branch_posts; Added `post_product_purchases` table |
| `convex/services/shoppablePosts.ts` | Complete shoppable posts service (350+ lines) |
| `convex/services/branchPosts.ts` | Updated createPost to accept product tags |

#### Frontend Components

| File | Description |
|------|-------------|
| `src/components/common/ShoppableProducts.jsx` | Product display, quick add, purchase modal |
| `src/components/common/SocialFeed.jsx` | Integrated shoppable products into feed |

---

## Schema Changes

### branch_posts Updates

```typescript
// Added to branch_posts table:
tagged_products: v.optional(v.array(v.object({
  product_id: v.id("products"),
  position: v.optional(v.object({  // Position on image
    x: v.number(),  // 0-100 percentage
    y: v.number(),
  })),
  note: v.optional(v.string()),  // "Used for styling"
}))),
is_shoppable: v.optional(v.boolean()),  // Quick filter flag
product_clicks: v.optional(v.number()),  // Engagement tracking
product_purchases: v.optional(v.number()),  // Conversion tracking
```

### New Table: post_product_purchases

```typescript
post_product_purchases: defineTable({
  post_id: v.id("branch_posts"),
  product_id: v.id("products"),
  user_id: v.optional(v.id("users")),
  transaction_id: v.optional(v.id("transactions")),
  quantity: v.number(),
  unit_price: v.number(),
  total_price: v.number(),
  source: v.union(
    v.literal("feed_quick_buy"),
    v.literal("feed_add_to_cart"),
    v.literal("product_modal")
  ),
  createdAt: v.number(),
})
```

---

## Ideas Generated (18)

### Phase 1: Role Playing (6)

| # | Persona | Idea |
|---|---------|------|
| 1 | Barber | "I used this pomade for this style" - tag products used |
| 2 | Customer | "I love this look AND the products" - one-tap purchase |
| 3 | Branch Owner | Track which posts drive product sales |
| 4 | Staff | Quick add-to-cart from feed, checkout at POS |
| 5 | Mobile User | Swipe-up to see product details |
| 6 | First-timer | "Shop the look" button on showcase posts |

### Phase 2: Cross-Pollination (8)

| Source | Idea |
|--------|------|
| **Instagram Shopping** | Product tags on images, tap to see price |
| **TikTok Shop** | "Shop Now" button, mini product cards |
| **Pinterest** | "Get the look" - multiple products bundled |
| **Amazon** | "Frequently bought together" suggestions |
| **Shopify** | Quick checkout, minimal friction |
| **ASOS** | Product hover cards with details |
| **Etsy** | Creator/barber story with products |
| **Sephora** | "Used in this look" product callouts |

### Phase 3: SCAMPER (4)

| Lens | Idea |
|------|------|
| Combine | Showcase post + product catalog in one view |
| Adapt | Shopping bag icon overlay on images |
| Modify | Add "Products Used" section below content |
| Put to Use | Use existing transaction system for purchases |

---

## UI Components

### 1. ShoppableBadge
Small indicator in post header showing product count.

```jsx
<ShoppableBadge productCount={3} />
// Renders: 🛒 3 products
```

### 2. ShoppableProducts
"Shop the Look" section showing tagged products with quick-add buttons.

Features:
- Product image, name, price
- Stock status indicator
- One-tap add to cart
- Success animation on add
- Optional product notes

### 3. QuickPurchaseModal
Full-screen modal for detailed product view and purchase.

Features:
- Large product image
- Full description
- Quantity selector
- Total price calculation
- Add to cart CTA

---

## Backend API

### Mutations

| Function | Description |
|----------|-------------|
| `tagProductsInPost` | Tag products in existing post |
| `removeProductTags` | Remove all product tags |
| `trackProductClick` | Track engagement metric |
| `recordPostPurchase` | Record purchase for analytics |
| `addToCartFromPost` | Add product to cart with post attribution |

### Queries

| Function | Description |
|----------|-------------|
| `getBranchProductsForTagging` | Get products for tagging UI |
| `getTaggedProductDetails` | Get full product info for display |
| `getShoppablePosts` | Get posts with products |
| `getShoppablePostAnalytics` | Analytics dashboard data |
| `getPostConversionFunnel` | Views → Clicks → Purchases |

---

## Analytics Dashboard

The `getShoppablePostAnalytics` query returns:

```typescript
{
  summary: {
    totalShoppablePosts: number,
    totalClicks: number,
    totalPurchases: number,
    totalRevenue: number,
    conversionRate: "X.XX%",
    avgOrderValue: number,
  },
  topPosts: [{ postId, content, clicks, purchases, revenue }],
  topProducts: [{ productId, name, quantity, revenue }],
  periodDays: 30,
}
```

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     FEED POST                                │
├─────────────────────────────────────────────────────────────┤
│  [Avatar] Barber Name    🛒 3 products                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Post Image                          │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  "Check out this fresh fade! Used Suavecito for styling..." │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🛒 SHOP THE LOOK (3 products)                         │   │
│  │                                                       │   │
│  │ ┌─────────────────────────────────────────────────┐  │   │
│  │ │ [Img] Suavecito Pomade           ₱450    [+]   │  │   │
│  │ └─────────────────────────────────────────────────┘  │   │
│  │ ┌─────────────────────────────────────────────────┐  │   │
│  │ │ [Img] Fade Comb Set              ₱180    [+]   │  │   │
│  │ └─────────────────────────────────────────────────┘  │   │
│  │ ┌─────────────────────────────────────────────────┐  │   │
│  │ │ [Img] Beard Oil                  ₱320    [+]   │  │   │
│  │ └─────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  🔥 42    🔖 Save    👁 128 views         [✂️ Book]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. Post Creation (Barber App)
When creating a showcase post, barbers can:
- Select products from their branch's catalog
- Add notes like "Used for styling"
- Products auto-validate (must be active, same branch)

### 2. SocialFeed (Customer App)
- Shoppable badge shows on post header
- "Shop the Look" section appears below content
- Quick-add buttons for each product
- Success animation on cart add

### 3. Analytics (Admin Dashboard)
- Track click-through rates
- Measure conversion funnel
- Identify top-performing posts
- See best-selling products from posts

---

## Next Steps for Phase 3

Remaining Breakthrough feature to implement:

- [ ] **BT4: Video Reels** - Short-form transformation content

---

**Session Completed:** 2026-02-04
**Total Ideas:** 18
**Implementation Status:** ✅ COMPLETE
