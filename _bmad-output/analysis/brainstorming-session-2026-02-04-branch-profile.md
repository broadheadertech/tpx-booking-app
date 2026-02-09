# Brainstorming Session: Branch Profile Feature

**Date:** February 4, 2026
**Topic:** Public-Facing Branch Profile Pages
**Status:** 🚧 PHASE 1 IMPLEMENTED

---

## Problem Statement

**Goal:** Create public-facing branch profile pages that serve as a "storefront" for each branch, enabling:
1. Customer discovery of branches and their offerings
2. Showcase of barbers and their work
3. Service menu transparency
4. Social-style posts by barbers and admins
5. Direct booking integration

---

## Session Parameters

| Decision | Choice |
|----------|--------|
| **Primary Audience** | Both: New customers discovering + Existing customers checking availability |
| **Posts Functionality** | Barbers can post (not just admin) |
| **Visibility** | Fully public (no authentication required) |
| **Platform Priority** | Desktop first, mobile responsive |

---

## Core Components

### 1. Branch Info Display
- Branch name, logo, cover photo
- Address with map integration
- Operating hours
- Contact info (phone, WhatsApp, email)
- Social media links
- Aggregate rating/reviews

### 2. Barbers List
- Photo, name, specialties
- Individual ratings
- "Book with [Name]" CTA
- Years of experience
- Portfolio link (to their posts)

### 3. Services Menu
- Service name, description, price
- Duration estimate
- Category grouping
- "Book this service" CTA

### 4. Posts Feed
- Social-style content from barbers/admins
- Multiple images per post
- Post types: showcase, promo, availability, announcement
- Chronological feed

---

## Schema Design

### New Table: `branch_posts`

```typescript
branch_posts: defineTable({
  // Core
  branch_id: v.id("branches"),
  author_id: v.id("users"),
  author_type: v.union(v.literal("barber"), v.literal("branch_admin"), v.literal("super_admin")),

  // Content
  post_type: v.union(
    v.literal("showcase"),      // Work photos/videos
    v.literal("promo"),         // Promotional offers
    v.literal("availability"),  // Open slots announcement
    v.literal("announcement"),  // General news
    v.literal("tip")            // Hair care tips
  ),
  content: v.string(),
  images: v.optional(v.array(v.string())), // Array of image URLs

  // Moderation
  status: v.union(
    v.literal("pending"),       // Awaiting approval
    v.literal("published"),     // Live
    v.literal("archived"),      // Hidden but not deleted
    v.literal("rejected")       // Rejected by admin
  ),

  // Features
  pinned: v.optional(v.boolean()),          // Pin to top of feed
  expires_at: v.optional(v.number()),       // For time-limited promos

  // Engagement (future)
  view_count: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_branch", ["branch_id"])
.index("by_branch_status", ["branch_id", "status"])
.index("by_author", ["author_id"])
.index("by_branch_type", ["branch_id", "post_type"])
```

### Schema Updates: `branches` table

```typescript
// Add to existing branches table
slug: v.optional(v.string()),              // URL-friendly name: "kapitolyo-branch"
cover_image: v.optional(v.string()),       // Hero image for profile
description: v.optional(v.string()),       // About this branch
social_links: v.optional(v.object({
  facebook: v.optional(v.string()),
  instagram: v.optional(v.string()),
  tiktok: v.optional(v.string()),
})),
```

---

## URL Structure

```
Public routes (no auth required):
/b/[branch-slug]              → Branch profile (main page)
/b/[branch-slug]/barbers      → All barbers list
/b/[branch-slug]/barber/[id]  → Individual barber profile
/b/[branch-slug]/services     → Full service menu
/b/[branch-slug]/posts        → Posts feed
/b/[branch-slug]/book         → Quick booking entry point
```

---

## Content Moderation Strategy

**Hybrid Approach (Recommended):**

| Barber Status | Posting Permission |
|--------------|-------------------|
| New barber (< 5 approved posts) | Requires admin approval |
| Trusted barber (5+ approved) | Auto-publish |
| Flagged barber | Back to requiring approval |

**Admin Controls:**
- View pending posts queue
- Approve/reject with reason
- Archive inappropriate posts
- Pin important announcements
- Set barber trust status

---

## Booking Integration Flow

```
Customer Journey:

1. Discovery
   └── Lands on /b/kapitolyo-branch (via Google, QR, link)

2. Browse
   ├── Views barbers → Sees "Book with Juan" button
   ├── Views services → Sees "Book this service" button
   └── Views posts → Sees barber showcase work

3. Booking Entry
   ├── Click "Book with Juan" → Pre-fills barber, redirects to booking
   ├── Click "Book [Service]" → Pre-fills service, redirects to booking
   └── Click "Book Now" (general) → Standard booking flow

4. Booking Completion
   └── Existing booking system handles the rest
```

---

## Analytics Tracking

| Metric | Purpose |
|--------|---------|
| Profile views | Branch popularity |
| Barber card clicks | Barber interest |
| Service views | Service demand |
| Post views | Content engagement |
| Book button clicks | Conversion intent |
| Booking completions | Actual conversion |
| Referral source | Marketing attribution |

---

## Implementation Phases

### Phase 1: Core Profile (MVP)
- [ ] Add `slug`, `cover_image`, `description` to branches schema
- [ ] Create public `/b/[slug]` route
- [ ] Display branch info, barbers, services
- [ ] "Book Now" CTAs linking to existing booking

### Phase 2: Posts System
- [ ] Create `branch_posts` table in schema
- [ ] Backend CRUD for posts
- [ ] Barber posting UI in their dashboard
- [ ] Admin moderation queue
- [ ] Public posts feed on branch profile

### Phase 3: Engagement & Polish
- [ ] View tracking implementation
- [ ] Booking conversion analytics
- [ ] SEO meta tags
- [ ] Social share buttons
- [ ] Individual barber profile pages

### Phase 4: Advanced Features
- [ ] Image upload/storage integration
- [ ] Post scheduling
- [ ] Promo expiry automation
- [ ] QR code generation for branches
- [ ] Google My Business sync

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/pages/branch/[slug].jsx` | Public branch profile page |
| `src/pages/branch/[slug]/barbers.jsx` | Barbers list page |
| `src/pages/branch/[slug]/services.jsx` | Services menu page |
| `src/pages/branch/[slug]/posts.jsx` | Posts feed page |
| `src/components/branch/BranchHero.jsx` | Hero section component |
| `src/components/branch/BarberCard.jsx` | Barber display card |
| `src/components/branch/ServiceCard.jsx` | Service display card |
| `src/components/branch/PostCard.jsx` | Post display card |
| `src/components/barber/CreatePostModal.jsx` | Barber post creation |
| `src/components/admin/PostModerationQueue.jsx` | Admin moderation |
| `convex/services/branchPosts.ts` | Posts backend service |
| `convex/services/branchProfile.ts` | Public profile queries |

### Modified Files
| File | Changes |
|------|---------|
| `convex/schema.ts` | Add `branch_posts` table, update `branches` |
| `src/pages/barber/Dashboard.jsx` | Add "My Posts" section |
| `src/pages/staff/Dashboard.jsx` | Add post moderation tab (for admins) |

---

## Technical Considerations

### SEO
- Server-side rendering or static generation for public pages
- Meta tags: title, description, Open Graph
- Schema.org LocalBusiness markup
- Sitemap generation for all branch profiles

### Performance
- Lazy load images
- Pagination for posts feed
- Cache branch profile data
- Optimize barber/service queries

### Security
- Public queries don't expose sensitive data
- Image upload validation
- Rate limiting on post creation
- XSS prevention in post content

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Profile page load time | < 2 seconds |
| Booking conversion rate | 5%+ of profile visitors |
| Post engagement | 50+ views per post average |
| Barber participation | 80% of barbers post monthly |
| SEO ranking | Top 3 for "[area] barbershop" |

---

## Future Enhancements

- [ ] Customer reviews/ratings on branch profile
- [ ] "Favorite" barbers feature
- [ ] Push notifications for new posts (for followers)
- [ ] Video posts support
- [ ] Before/after image comparisons
- [ ] Real-time availability display
- [ ] WhatsApp integration for inquiries
- [ ] Multi-language support

---

## References

- Existing schema: `convex/schema.ts`
- Branches service: `convex/services/branches.ts`
- Barbers service: `convex/services/barbers.ts`
- Services: `convex/services/services.ts`
- Booking flow: `src/components/customer/ServiceBooking.jsx`
