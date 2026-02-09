---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Booking Sequence/Flow Redesign'
session_goals: 'Create modern wow-factor booking experience, learn from successful booking apps'
selected_approach: 'AI-Recommended Techniques'
techniques_used: ['Cross-Pollination', 'Journey Mapping', 'Reverse Brainstorming']
ideas_generated: 120
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** MASTERPAINTER
**Date:** 2026-02-04
**Topic:** Booking Sequence/Flow Redesign

---

## Session Overview

**Goals:**
- Create a modern, "wow-factor" booking experience
- Learn from best-in-class booking apps (Booksy, Fresha, StyleSeat, etc.)
- Fix emotional low points in current flow
- Apply mobile-first design principles

### Current State Analysis

Both flows (Auth + Guest) follow a 5-8 step wizard:

| Step | Auth Flow | Guest Flow |
|------|-----------|------------|
| 1 | Select Branch | Select Branch |
| 2 | Choose Barber | Choose Barber |
| 3 | Choose Service | Choose Service |
| 4 | Select Date/Time | Guest Info |
| 5 | Confirm Booking | Select Date/Time |
| 6 | Success | Confirm Booking |
| 7 | Custom Form | Success |
| 8 | Payment Pending | Payment Pending |

**Current Design Issues:**
- Linear wizard feels dated
- Generic step indicators (numbered dots)
- Basic list cards with simple hover states
- Accordion-based service categories
- No visual delight or micro-interactions
- Mobile experience feels like a desktop form
- No smart suggestions or personalization

---

## Technique 1: Cross-Pollination (50 Ideas)

### Booksy Patterns (#1-7)

| # | Pattern | Description |
|---|---------|-------------|
| 1 | Map-First Discovery | Opens with map showing nearby salons with pins |
| 2 | Horizontal Service Chips | Quick-tap service buttons at top |
| 3 | Provider Cards with Portfolio | Barber cards show 3-4 recent work photos |
| 4 | "Next Available" Badge | Shows "Available today at 2pm" on each provider |
| 5 | Floating Book Button | Sticky CTA at bottom throughout browsing |
| 6 | Calendar Strip Picker | Horizontal scrolling week view |
| 7 | Time Slot Pills | Rounded pill buttons for times |

### Fresha Patterns (#8-14)

| # | Pattern | Description |
|---|---------|-------------|
| 8 | Single-Screen Booking | Service + Staff + Time all on ONE screen |
| 9 | Smart Defaults | Pre-selects "Any Professional" and "First Available" |
| 10 | Inline Price Display | Price shows next to each service, updates total live |
| 11 | Duration Badges | "45 min" badge on each service card |
| 12 | Staff Availability Grid | Shows all staff with their next available slot |
| 13 | "Add Another Service" Button | Easy multi-service booking |
| 14 | Confirmation Animation | Confetti/checkmark animation on success |

### StyleSeat Patterns (#15-21)

| # | Pattern | Description |
|---|---------|-------------|
| 15 | Portfolio-First Profiles | Full-screen gallery of barber's work |
| 16 | "Book Instantly" vs "Request" | Clear distinction for booking types |
| 17 | Price Range Display | "$25-45" when price varies |
| 18 | Reviews with Photos | Customer reviews include result photos |
| 19 | "Your Stylist" Section | Remembers and highlights regular barber |
| 20 | Deposit Badge | Clear "$10 deposit required" indicator |
| 21 | Cancellation Policy Inline | Shows policy early |

### Calendly Patterns (#22-28)

| # | Pattern | Description |
|---|---------|-------------|
| 22 | Month View with Dots | Calendar shows dots on available days |
| 23 | Time Zone Auto-Detect | Automatically shows times in user's timezone |
| 24 | Single Column Times | Vertical list of times, not grid |
| 25 | "What" Then "When" | Service first, then time |
| 26 | Minimal Form Fields | Only asks essential info |
| 27 | Calendar Sync Preview | Shows "This will appear in your calendar" |
| 28 | Buffer Indicators | Shows "15 min buffer before next slot" |

### OpenTable Patterns (#29-35)

| # | Pattern | Description |
|---|---------|-------------|
| 29 | Party Size First | Asks context before showing availability |
| 30 | Time Window Buttons | "Breakfast | Lunch | Dinner" quick filters |
| 31 | "See All Times" Expand | Shows 3 times, tap to see full list |
| 32 | Points/Rewards Badge | "Earn 100 points with this booking" |
| 33 | "Popular Time" Indicators | 🔥 icon on high-demand slots |
| 34 | Confirmation Code Large | Big, copy-able confirmation number |
| 35 | Add to Wallet | Apple/Google Wallet pass generation |

### Uber Patterns (#36-42)

| # | Pattern | Description |
|---|---------|-------------|
| 36 | Bottom Sheet Flow | Content slides up from bottom |
| 37 | Pill-Based Selection | Tap pills to select, not dropdowns |
| 38 | Live ETA Updates | "Your barber will be ready in 2h 15m" |
| 39 | Recent/Favorites First | Shows recent branches at top |
| 40 | One-Tap Rebook | "Book again" with same settings |
| 41 | Swipe to Confirm | Swipe gesture to finalize booking |
| 42 | Progress Indicator Dots | Subtle dots showing current step |

### Airbnb Patterns (#43-50)

| # | Pattern | Description |
|---|---------|-------------|
| 43 | Full-Bleed Hero Images | Large, beautiful images dominate cards |
| 44 | Wishlist Heart | Save favorites with heart icon |
| 45 | "Rare Find" Badge | Scarcity indicator for popular options |
| 46 | Host/Provider Intro | Personal message from barber |
| 47 | Split Payment Option | "Pay now" vs "Pay later" clear choice |
| 48 | Review Summary Cards | "Cleanliness 4.8 | Service 4.9" breakdown |
| 49 | "Before You Book" Section | Important info highlighted before confirm |
| 50 | Animated Transitions | Smooth, delightful screen transitions |

---

## Technique 2: Journey Mapping (30 Ideas)

### Service Selection Pain Point (#51-55)

| # | Idea | Description |
|---|------|-------------|
| 51 | Horizontal Category Chips | Replace accordions with tappable filter chips |
| 52 | "Popular" Badge on Services | Guide decision with social proof |
| 53 | "Your Last Service" Card | Pre-select returning customer's usual |
| 54 | Service Preview Images | Visual representation of each service |
| 55 | Quick Pick: "Same as Last Time" | One-tap repeat for regulars |

### Date/Time Selection Pain Point (#56-61)

| # | Idea | Description |
|---|------|-------------|
| 56 | Calendar Strip (Week View) | Horizontal scroll, see whole week |
| 57 | Time Slot Pills | Tappable pills, not radio buttons |
| 58 | "Popular Time" Fire Badge | 🔥 on high-demand slots |
| 59 | Availability Heat Map | Color intensity shows openings |
| 60 | "Next Available" Quick Pick | Skip date/time entirely |
| 61 | Smart Time Suggestions | "Your usual: Sat 10am" |

### Barber Selection Pain Point (#62-67)

| # | Idea | Description |
|---|------|-------------|
| 62 | Portfolio Thumbnails on Card | 3-4 recent cuts visible |
| 63 | Star Rating + Review Count | ⭐ 4.9 (127 reviews) |
| 64 | "Next Available" Badge | "Today at 2pm" on each barber |
| 65 | "Your Barber" Highlight | Gold border on user's regular |
| 66 | Specialty Tags | "Fades Expert" "Beard Master" |
| 67 | "Help Me Choose" Button | Launches barber matcher quiz |

### Branch Selection Pain Point (#68-73)

| # | Idea | Description |
|---|------|-------------|
| 68 | Map View Toggle | See branches on map with pins |
| 69 | Distance Badges | "0.8 km away" on each branch |
| 70 | "Your Branch" Auto-Select | Default to last-used branch |
| 71 | Branch Photos | Thumbnail of the shop |
| 72 | Wait Time Indicator | "Currently: ~15 min wait" |
| 73 | "Open Now" Badge | Green dot for currently open |

### Success/Delight Opportunities (#74-80)

| # | Idea | Description |
|---|------|-------------|
| 74 | Confetti Animation | Celebration on booking confirm |
| 75 | Animated Checkmark | Satisfying check animation |
| 76 | Add to Calendar Button | One-tap Google/Apple calendar |
| 77 | Share Appointment | Share booking details |
| 78 | "Set Reminder" Option | Custom reminder timing |
| 79 | Points Earned Animation | "+50 points" flies into wallet |
| 80 | Apple/Google Wallet Pass | Add booking to phone wallet |

---

## Technique 3: Reverse Brainstorming (40 Ideas)

### Navigation & Flow (#81-86)

| # | Terrible Idea | Inverted Breakthrough |
|---|---------------|----------------------|
| 81 | Add 15 steps to book | **2-3 tap booking** with smart defaults |
| 82 | Random step order | **Predictable + skippable** flow |
| 83 | No back button | **Persistent state** - leave and return |
| 84 | Hide the "Book" button | **Floating sticky CTA** always visible |
| 85 | Require account first | **Browse-first, login-later** |
| 86 | Reset on error | **Error recovery** - fix just the error |

### Information Starvation (#87-92)

| # | Terrible Idea | Inverted Breakthrough |
|---|---------------|----------------------|
| 87 | No barber photos | **Portfolio-first cards** |
| 88 | Hide prices until checkout | **Live price display** |
| 89 | No availability indicators | **Real-time availability** |
| 90 | Generic service names | **Rich service cards** |
| 91 | No ratings or reviews | **Social proof everywhere** |
| 92 | Hide branch hours | **Live status badges** |

### Time Wasting (#93-98)

| # | Terrible Idea | Inverted Breakthrough |
|---|---------------|----------------------|
| 93 | Show ALL time slots | **Only show available** |
| 94 | No search or filter | **Smart filters + search** |
| 95 | Reload page on every selection | **Instant transitions** |
| 96 | 10-second loading between steps | **Optimistic UI** |
| 97 | No "quick rebook" option | **One-tap repeat** |
| 98 | Forget user preferences | **Remember everything** |

### Decision Paralysis (#99-104)

| # | Terrible Idea | Inverted Breakthrough |
|---|---------------|----------------------|
| 99 | Show 100 services at once | **Top 3-5 visible** with expand |
| 100 | No recommendations | **"Recommended for you"** |
| 101 | All barbers look the same | **Unique barber profiles** |
| 102 | No "Any barber" option | **"First Available" default** |
| 103 | Force exact time selection | **Time ranges** - Morning/Afternoon/Evening |
| 104 | No trending indicators | **"Most Booked" badges** |

### Anxiety Inducers (#105-110)

| # | Terrible Idea | Inverted Breakthrough |
|---|---------------|----------------------|
| 105 | Unclear cancellation policy | **Policy preview** shown early |
| 106 | No confirmation email | **Multi-channel confirm** |
| 107 | Generic success message | **Celebration moment** |
| 108 | Can't modify after booking | **Easy modify** without cancelling |
| 109 | No reminder before appointment | **Smart reminders** |
| 110 | Hidden total cost | **Transparent breakdown** |

### Mobile Hostility (#111-116)

| # | Terrible Idea | Inverted Breakthrough |
|---|---------------|----------------------|
| 111 | Tiny tap targets | **Generous touch zones** (44px min) |
| 112 | Dropdown menus everywhere | **Tap-to-select pills** |
| 113 | Full keyboard for date | **Visual date picker** |
| 114 | Horizontal scrolling tables | **Vertical stacking** |
| 115 | Fixed elements cover content | **Smart positioning** |
| 116 | No haptic feedback | **Tactile response** |

### Trust Destroyers (#117-120)

| # | Terrible Idea | Inverted Breakthrough |
|---|---------------|----------------------|
| 117 | No photos of the shop | **Branch gallery** |
| 118 | Anonymous barber profiles | **Personal intros** |
| 119 | No customer reviews | **Recent reviews** with photos |
| 120 | Unclear what's included | **Service details** |

---

## Prioritized Implementation Roadmap

### Phase 1: Quick Wins (Immediate Impact)

| Priority | Feature | Ideas | Effort |
|----------|---------|-------|--------|
| QW1 | Calendar Strip + Time Pills | #6, #7, #56, #57, #113 | Medium |
| QW2 | Progress Dots (not numbers) | #42 | Low |
| QW3 | Confirmation Animation | #14, #74, #75, #107 | Low |
| QW4 | Live Price Display | #10, #88, #110 | Low |
| QW5 | Smart Defaults | #9, #98, #102 | Medium |

### Phase 2: Core Upgrades (Major UX Lift)

| Priority | Feature | Ideas | Effort |
|----------|---------|-------|--------|
| CU1 | Barber Portfolio Cards | #3, #62, #63, #87 | High |
| CU2 | Service Category Chips | #2, #51, #112 | Medium |
| CU3 | One-Tap Rebook | #40, #55, #97 | Medium |
| CU4 | Sticky Floating CTA | #5, #84 | Low |
| CU5 | Real-time Availability | #4, #64, #89 | Medium |

### Phase 3: Premium Experience

| Priority | Feature | Ideas | Effort |
|----------|---------|-------|--------|
| PE1 | Map-First Branch Selection | #1, #68, #69 | High |
| PE2 | "Help Me Choose" Matcher | #67, #100 | High |
| PE3 | Add to Wallet | #35, #80 | Medium |
| PE4 | Swipe to Confirm | #41 | Medium |
| PE5 | Single-Screen Booking | #8, #81 | High |

---

## Visual Mockup: Target Booking Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: BRANCH (Bottom Sheet)                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📍 Your Branch                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🏪 TPX Makati   ⭐4.9   0.5km   🟢 Open Now          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📍 Other Branches                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🏪 TPX BGC      ⭐4.8   2.1km   🟢 Open              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🏪 TPX Ortigas  ⭐4.7   3.4km   ⚫ Closed            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [🗺️ View Map]                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: SERVICE (Horizontal Chips + Cards)                  │
├─────────────────────────────────────────────────────────────┤
│  ● ● ○ ○                                                    │
│                                                             │
│  [💇 Haircut] [🧔 Beard] [✨ Package] [📦 Other]            │
│                                                             │
│  ⭐ Your Usual                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✂️ Regular Haircut        ₱250   45min   [Select]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🔥 Popular                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✂️ Fade + Design          ₱350   60min   [Select]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: BARBER (Portfolio Cards)                            │
├─────────────────────────────────────────────────────────────┤
│  ● ● ● ○                                                    │
│                                                             │
│  👑 Your Barber                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ┌────────────────┐  Jay                              │   │
│  │ │ 📸 📸 📸 📸     │  ⭐ 4.9 (127 reviews)            │   │
│  │ │  (portfolio)   │  🏷️ Fades Expert                  │   │
│  │ └────────────────┘  ⚡ Next: Today 2pm               │   │
│  │                     [Book with Jay]                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [🎲 Help Me Choose]   [👤 Any Available]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: DATE & TIME (Calendar Strip + Pills)                │
├─────────────────────────────────────────────────────────────┤
│  ● ● ● ●                                                    │
│                                                             │
│  ◀ February 2026 ▶                                          │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐               │
│  │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │               │
│  │  3  │  4  │ [5] │  6  │  7  │  8  │  9  │               │
│  │     │     │ ✓   │  •  │  •  │  •  │     │               │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘               │
│                                                             │
│  ⚡ Your Usual: Sat 10am                                    │
│                                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ 9:00 │ │ 9:30 │ │10:00 │ │10:30 │ │11:00 │              │
│  │  AM  │ │  AM  │ │  AM  │ │  AM  │ │  AM  │              │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘              │
│  ┌──────┐ ┌──────┐ ┌──────┐                                │
│  │11:30 │ │ 2:00 │ │ 2:30 │  🔥 Popular                    │
│  │  AM  │ │  PM  │ │  PM  │                                │
│  └──────┘ └──────┘ └──────┘                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: CONFIRM (Clean Summary)                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✂️ Regular Haircut                                   │   │
│  │                                                     │   │
│  │ 📅 Wed, Feb 5 at 10:00 AM                           │   │
│  │ 👤 Jay @ TPX Makati                                 │   │
│  │ ⏱️ 45 minutes                                       │   │
│  │                                                     │   │
│  │ ─────────────────────────────────────────           │   │
│  │ Service                              ₱250           │   │
│  │ Booking Fee                           ₱20           │   │
│  │ ─────────────────────────────────────────           │   │
│  │ Total                                ₱270           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚡ Free cancellation until 24h before                      │
│                                                             │
│  ══════════════════════════════════════════════════════    │
│  │      ➡️  SWIPE TO CONFIRM BOOKING  ➡️              │    │
│  ══════════════════════════════════════════════════════    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SUCCESS! 🎉                                                 │
├─────────────────────────────────────────────────────────────┤
│                    ✨ 🎊 ✨                                  │
│                                                             │
│                    ┌─────┐                                  │
│                    │  ✓  │  (animated)                      │
│                    └─────┘                                  │
│                                                             │
│               You're all set!                               │
│                                                             │
│          ┌─────────────────────────┐                        │
│          │   BOOKING #A8F3K2      │                        │
│          │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │  (QR)                   │
│          │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │                        │
│          └─────────────────────────┘                        │
│                                                             │
│          +50 points earned! 🎯                              │
│                                                             │
│  [📅 Add to Calendar]  [📲 Add to Wallet]                   │
│                                                             │
│              [View My Bookings]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Session Summary

### Key Achievements
- **120 breakthrough ideas** generated for booking flow redesign
- **3 techniques** applied: Cross-Pollination, Journey Mapping, Reverse Brainstorming
- **7 top booking apps** analyzed for patterns
- **Clear 3-phase roadmap** with prioritized features

### Top 10 Must-Implement Features

1. **Calendar Strip + Time Pills** - Replace boring date input
2. **Barber Portfolio Cards** - Build trust before booking
3. **Service Category Chips** - Replace accordions
4. **One-Tap Rebook** - Speed for regulars
5. **Progress Indicator Dots** - Modern step indicator
6. **Confirmation Animation** - Instant delight
7. **Live Price Display** - Transparency
8. **Smart Defaults** - Reduce decisions
9. **Floating Sticky CTA** - Always visible booking
10. **Real-time Availability** - No wasted selections

---

**Session Completed:** 2026-02-04
**Total Ideas:** 120
**Techniques Used:** 3
**Prioritized Actions:** 15 (5 Quick Wins + 5 Core Upgrades + 5 Premium)

🎉 **Congratulations on a productive brainstorming session!**
