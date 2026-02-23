---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'AI Mirroring — Virtual Hairstyle Try-On with Live Face Filters'
session_goals: 'Explore free + reliable tech approaches, UX flow, and integration into TPX booking app'
selected_approach: 'AI-Recommended Techniques'
techniques_used: ['First Principles Thinking', 'Morphological Analysis', 'Constraint Mapping', 'Cross-Pollination']
ideas_generated: ['swipe-to-try', 'my-looks-board', 'face-shape-profile', 'trending-for-face', 'hair-color-experimenter', 'product-cross-sell', 'share-your-look', 'barber-consultation-mode', 'style-journey']
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** MASTERPAINTER
**Date:** 2026-02-23

## Session Overview

**Topic:** AI Mirroring — Virtual Hairstyle Try-On with Live Face Filters
**Goals:** Explore free & reliable tech approaches for a live camera hairstyle filter feature. Users try different haircuts on their face in real-time, evaluate the look, and save favorites. Must be free/open-source tooling.

### Context Guidance

_TPX Booking App — barbershop booking platform with multi-branch support, Convex backend, React + Vite frontend._

---

## Technique 1: First Principles Thinking

### Core Building Blocks
1. **Face Detection** — Know where the face is, its angle, key landmarks
2. **Hairstyle Asset** — Visual representation of a haircut for overlay
3. **Real-time Rendering** — Overlay tracks face as it moves (live camera)
4. **Capture/Save** — Snapshot result and store it

### Minimum Pipeline
```
Camera Feed → Face Mesh (468 landmarks) → Position hairstyle PNG → Render on Canvas → Save to Convex
```

### Assumptions Challenged
- "We need 3D hair models" → 2D PNG overlay is 80% as good at 10% effort
- "It needs photorealism" → Stylized is fine, users want to see shape/style
- "We need AI to generate hairstyles" → Curated library is more relevant
- "This is huge" → Core is face mesh + PNG positioning + save = 2-3 files

---

## Technique 2: Morphological Analysis

### Winning Tech Stack (Free + Advanced)
```
MediaPipe Face Mesh (face landmarks, client-side, unlimited)
+ MediaPipe Selfie Segmentation (hair region isolation)
+ Face Shape Classification (from landmark geometry — no API needed)
+ Hugging Face Inference API (free tier — AI hairstyle transfer, optional)
+ Canvas/WebGL real-time rendering
+ Convex storage for saved looks
```

### Two-Mode System
- **LIVE PREVIEW** (instant): Hairstyle PNG overlay tracks face in real-time
- **AI TRANSFORM** (3-5 sec): Selfie → Hugging Face → realistic AI version

### Face Shape Classification (Pure Geometry)
```
Forehead width  = distance(landmark[54], landmark[284])
Jaw width       = distance(landmark[172], landmark[397])
Face height     = distance(landmark[10], landmark[152])
Cheekbone width = distance(landmark[234], landmark[454])

→ Oval, Round, Square, Heart, Oblong, Diamond
```

### Face Shape → Hairstyle Compatibility
| Face Shape | Best Styles | Avoid |
|-----------|-------------|-------|
| Oval | Textured crop, quiff, pompadour | Very heavy bangs |
| Round | Faux hawk, high fade, pompadour | Flat sides, bowl cuts |
| Square | French crop, side part | Very short all over |
| Heart | Side-swept, textured layers | Slicked back tight |
| Oblong | Side part, classic taper | Extra height on top |

---

## Technique 3: Constraint Mapping

### Hard Constraints
- **Free**: MediaPipe (unlimited client-side), Hugging Face (1000 req/mo free)
- **Browser-based**: MediaPipe WASM works in all modern browsers
- **Mobile performance**: MediaPipe optimized for mobile, 30fps on mid-range phones
- **React + Vite**: MediaPipe has React wrappers
- **Convex backend**: Snapshots → Convex file storage

### Paper Tigers (Not Real Constraints)
- "Need 3D models" → 2D overlays with face mesh alignment work great
- "Need huge library" → 15-20 curated styles > 200 random ones
- "AI is slow" → Live preview is instant; AI is the bonus
- "Face shape needs ML" → Pure geometry from landmarks
- "Needs backend server" → Everything client-side except saving

### Standalone Feature: "Discover Your Face Shape"
```
Open AI Mirror → Camera → Face detected → Scanning animation →
REVEAL: "You have an OVAL face!" → Diagram + explainer →
"Best hairstyles for you:" → Top 5 recommendations → "Try them on!"
```
Funnel: **Discover → Explore → Try On → Save → Book**

---

## Technique 4: Cross-Pollination

### Sources Raided
- Snapchat/Instagram/TikTok (filters UX)
- Warby Parker (virtual try-on → purchase flow)
- Pinterest/salon apps (lookbooks, community)
- Sephora Virtual Artist (color matching, tutorials)
- Nike Fit (AR scanning, saved profiles)

---

## Selected Features (Prioritized by User)

### Priority Features

| # | Feature | Description | Source |
|---|---------|-------------|--------|
| 1 | **Swipe-to-try carousel** | Swipe left/right to cycle through hairstyles live on your face | Snapchat + TikTok |
| 2 | **"My Looks" board** | Save tried styles into personal lookbook with comparison grid | Pinterest + Warby Parker |
| 3 | **Face shape profile** | Detect once, personalize forever. Stored in user account | Nike Fit + Sephora |
| 4 | **Trending for your face** | "87% of oval-face users loved the textured crop this month" | Pinterest + Sephora |
| 5 | **Hair color experimenter** | Not just cuts — try different hair colors too (tint overlay) | Sephora |
| 6 | **Product cross-sell** | "This style needs: [product]" → links to existing product catalog | Sephora + Nike |
| 7 | **Share your look** | Generate shareable image card with face + style name + branch branding | All social apps |
| 8 | **Barber consultation mode** | Barber opens with customer, recommends styles live during consultation | Sephora + salon apps |
| 9 | **Style journey** | Track styles tried over time, before/after from actual haircuts | Nike Fit |

---

## Implementation Architecture

### Tech Stack
| Layer | Tool | Cost |
|-------|------|------|
| Face Detection | MediaPipe Face Mesh | Free, client-side |
| Hair Segmentation | MediaPipe Selfie Segmentation | Free, client-side |
| Face Shape Classification | Custom geometry from landmarks | Free, no API |
| AI Hairstyle Transfer | Hugging Face Inference API | Free tier (1000/mo) |
| Real-time Rendering | Canvas 2D / WebGL | Free, browser native |
| Storage | Convex file storage + metadata tables | Existing infrastructure |
| Hair Color Tinting | Canvas color manipulation | Free, client-side |

### User Flow
```
1. "AI Mirror" button in customer dashboard/booking flow
2. Camera opens → MediaPipe initializes (scanning animation)
3. Face shape detected → "You have an OVAL face!" reveal
4. Hairstyle carousel appears (filtered by face shape compatibility)
5. Swipe through styles — live overlay on face
6. Each style shows: ★★★★★ compatibility + "Trending" badge
7. Tap "Try Color" → hair color picker overlays
8. Tap heart → saved to "My Looks" board
9. Tap share → generates branded image card
10. Tap "Book This Style" → pre-fills booking with style reference image
11. "Products for this style" → cross-sell from shop catalog
```

### Barber Mode Flow
```
1. Staff opens "AI Mirror" from customer profile or during booking
2. Same camera + face mesh on customer
3. Barber swipes through recommendations
4. "I recommend this for your face shape because..."
5. Customer approves → attached to booking as reference
```
