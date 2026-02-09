---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Phase 3 Breakthrough: Personalized Feed Algorithm'
session_goals: 'TikTok-style For You feed that learns from user behavior and style preferences'
selected_approach: 'Deep-Dive Implementation'
techniques_used: ['Role Playing', 'Cross-Pollination', 'SCAMPER']
ideas_generated: 32
context_file: ''
session_active: false
workflow_completed: true
implementation_status: 'COMPLETED'
---

# Brainstorming Session: Phase 3 - Personalized Feed Algorithm

**Facilitator:** MASTERPAINTER
**Date:** 2026-02-04
**Status:** ✅ IMPLEMENTED

---

## Feature Vision

TikTok-style "For You" feed that learns from user behavior (saves, views, bookings) and style preferences from the Barber Matcher to deliver personalized content recommendations.

---

## Implementation Summary

### Files Created/Modified

#### Backend (Convex)

| File | Description |
|------|-------------|
| `convex/schema.ts` | Added 3 new tables for feed personalization |
| `convex/services/feedAlgorithm.ts` | Complete feed algorithm service (480+ lines) |

#### Frontend Components

| File | Description |
|------|-------------|
| `src/components/common/SocialFeed.jsx` | Updated with For You tab and interaction tracking |

---

## Schema Changes

### New Tables

#### 1. feed_interactions
Tracks individual user engagement with posts for algorithm learning.

```typescript
feed_interactions: defineTable({
  user_id: v.id("users"),
  post_id: v.id("branch_posts"),
  interaction_type: v.union(
    v.literal("view"),           // Viewed the post
    v.literal("view_long"),      // Viewed > 5 seconds
    v.literal("like"),           // Fire reaction
    v.literal("bookmark"),       // Saved post
    v.literal("book"),           // Booked from this post
    v.literal("skip")            // Scrolled past quickly
  ),
  barber_id: v.optional(v.id("barbers")),
  post_type: v.optional(v.string()),
  style_vibes: v.optional(v.array(v.string())),
  view_duration_ms: v.optional(v.number()),
  resulted_in_booking: v.optional(v.boolean()),
  booking_id: v.optional(v.id("bookings")),
  createdAt: v.number(),
  expires_at: v.optional(v.number()),
})
```

#### 2. user_feed_profile
Aggregated preferences for fast lookups during feed generation.

```typescript
user_feed_profile: defineTable({
  user_id: v.id("users"),
  barber_affinities: v.optional(v.array(v.object({
    barber_id: v.id("barbers"),
    score: v.number(),           // 0-100 affinity
    last_interaction: v.number(),
    booking_count: v.number(),
    like_count: v.number(),
  }))),
  preferred_vibes: v.optional(v.array(v.union(
    v.literal("classic"),
    v.literal("trendy"),
    v.literal("edgy"),
    v.literal("clean")
  ))),
  vibe_scores: v.optional(v.object({
    classic: v.optional(v.number()),
    trendy: v.optional(v.number()),
    edgy: v.optional(v.number()),
    clean: v.optional(v.number()),
  })),
  preferred_post_types: v.optional(v.array(v.string())),
  total_interactions: v.number(),
  profile_version: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

#### 3. post_bookmarks
Dedicated table for saved posts.

```typescript
post_bookmarks: defineTable({
  user_id: v.id("users"),
  post_id: v.id("branch_posts"),
  createdAt: v.number(),
})
```

---

## Algorithm Design

### Feed Score Formula

```
PostScore =
  (BaseEngagement × 0.2) +      // Post's overall likes/views
  (StyleMatch × 0.3) +           // Vibe alignment from Matcher
  (BarberAffinity × 0.25) +      // User's history with barber
  (RecencyBoost × 0.15) +        // Newer posts get bump
  (DiversityPenalty × 0.1)       // Prevent same-barber spam
```

### Signal Weights

| Signal | Weight | Decay Period |
|--------|--------|--------------|
| Booked from post | +50 | 30 days |
| Bookmarked | +20 | 14 days |
| Fire reaction | +10 | 7 days |
| View > 5 sec | +3 | 3 days |
| Basic view | +1 | 1 day |
| Skip (< 1 sec) | -2 | 1 day |

### Diversity Rules

- Max 2 posts from same barber in top 10 results
- Vacation posts penalized (-30 score)
- Pinned posts boosted (+20 score)

---

## Ideas Generated (32)

### Phase 1: Role Playing (12)

| # | Persona | Idea |
|---|---------|------|
| 1 | New Customer | Show "For You" first, "Recent" as secondary |
| 2 | Loyal Customer | Boost posts from barbers you've booked with |
| 3 | Style Explorer | Boost posts matching quiz vibe preferences |
| 4 | Casual Viewer | Track post view time (dwell = interest) |
| 5 | Active User | Fire reaction weights more than view |
| 6 | Saver | Bookmark = strong preference signal |
| 7 | Converter | "Book from post" = highest signal |
| 8 | First-Timer | Show trending until signals built |
| 9 | Curious User | Show "Because you like X style" explanation |
| 10 | Returning User | Decay old signals (recency weighting) |
| 11 | Impatient Scroller | Skip detection (< 1 sec = not interested) |
| 12 | Explorer | Show similar styles if favorite unavailable |

### Phase 2: Cross-Pollination (15)

#### TikTok For You
| # | Idea |
|---|------|
| 13 | Engagement rate > follower count in ranking |
| 14 | Content freshness bonus (boost new posts) |
| 15 | Diversity injection (prevent same-barber spam) |

#### Instagram Explore
| # | Idea |
|---|------|
| 16 | "Similar to posts you've liked" section |
| 17 | Category-based recommendations |
| 18 | Trending vibe surfacing |

#### Spotify Discover Weekly
| # | Idea |
|---|------|
| 19 | Weekly "Fresh Cuts For You" digest |
| 20 | Collaborative filtering: "Customers like you booked..." |
| 21 | Style taste profile radar chart |

#### Netflix
| # | Idea |
|---|------|
| 22 | "Because you booked with [Barber]" row |
| 23 | "Trending at your branch" section |
| 24 | Percentage match on post cards |

### Phase 3: SCAMPER (8)

| # | Lens | Idea |
|---|------|------|
| 25 | Substitute | Replace chronological with engagement-weighted |
| 26 | Combine | Combine Matcher vibes + booking history |
| 27 | Adapt | Adapt TikTok's dwell time tracking |
| 28 | Modify | Add "Match Score" badge to posts |
| 29 | Put to Use | Use existing post_likes for signals |
| 30 | Put to Use | Use user_style_preferences from Matcher |
| 31 | Eliminate | Remove vacation posts from For You |
| 32 | Reverse | Let users "Not interested" to train algo |

---

## UI Changes

### SocialFeed Updates

1. **Mode Toggle** - "For You" (default) and "Recent" tabs
2. **Personalization Badge** - Shows "For You" on personalized posts
3. **Status Indicator** - Shows personalization status
4. **Functional Bookmark** - Now saves posts and feeds algorithm
5. **View Tracking** - Intersection Observer tracks dwell time

### UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     SOCIAL FEED                              │
├─────────────────────────────────────────────────────────────┤
│  [✨ For You]  [🕐 Recent]  ← Mode Toggle (Default: For You) │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ✨ For You                                            │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ Post from barber matching your style...        │   │   │
│  │ │ 🔥 Like  🔖 Bookmark  ✂️ Book                  │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  │                                                       │   │
│  │ Personalized based on 42 interactions                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  OR (in Recent mode)                                         │
│                                                              │
│  [All] [Showcase] [News] [Promos] [Available] [Away] [Tips] │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Chronological posts with type filters...               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration with Barber Matcher (BT1)

The feed algorithm seamlessly integrates with the Barber Matcher:

1. **Vibe Preferences** - `user_style_preferences.vibes` from Matcher quiz
2. **Barber Profiles** - `barbers.style_vibes` from matcher profile
3. **Style Matching** - 30% weight for vibe alignment in scoring
4. **Priority Merge** - Matcher vibes take priority over learned vibes

---

## Backend API

### Queries

| Function | Description |
|----------|-------------|
| `getForYouFeed` | Get personalized feed with scoring |
| `getTrendingPosts` | Get trending for cold start |
| `getUserFeedProfile` | Get user's aggregated preferences |
| `getUserBookmarks` | Get saved posts |
| `hasUserBookmarkedPost` | Check bookmark status |
| `getUserTasteProfile` | Get complete style profile for display |

### Mutations

| Function | Description |
|----------|-------------|
| `recordInteraction` | Record view/like/bookmark/book |
| `toggleBookmark` | Save/unsave post |
| `updateUserFeedProfile` | Recalculate aggregated preferences |

---

## Next Steps for Phase 3

Remaining Breakthrough features to implement:

- [ ] **BT3: Shoppable Posts** - In-feed product commerce
- [ ] **BT4: Video Reels** - Short-form transformation content

---

**Session Completed:** 2026-02-04
**Total Ideas:** 32
**Implementation Status:** ✅ COMPLETE
