---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Improving how barbers know and prepare for their next service'
session_goals: 'Better visibility, readiness cues, workflow awareness for barbers'
selected_approach: 'ai-recommended'
techniques_used: ['Role Playing', 'SCAMPER Method', 'Cross-Pollination']
ideas_generated: [29]
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** MASTERPAINTER
**Date:** 2026-02-07

## Session Overview

**Topic:** Improving how barbers know and prepare for their next service
**Goals:** Better visibility, readiness cues, workflow awareness for barbers

### Context Guidance

_Current state: Barber Dashboard has an "Up Next" gradient card showing next booking (customer, service, time, price). Today's Schedule shows first 5 bookings collapsible. Bookings tab has full list with filters. No prep info, no timeline, no customer preferences shown._

### Session Setup

_UX/product improvement for a real barbershop booking app. Concrete problem with multiple solution angles (UI, data, workflow, notifications). Barbers need effortless awareness of what's coming, who's coming, and how to prepare._

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Barber next-service awareness with focus on visibility, readiness, and workflow

**Recommended Techniques:**

- **Role Playing:** Embody the barber persona to uncover real workflow pain points and moments where next-service awareness matters most
- **SCAMPER Method:** Systematically generate solutions across 7 lenses (Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse)
- **Cross-Pollination:** Transfer proven patterns from other industries (ride-sharing, restaurants, hospitals) to the barber context

**AI Rationale:** Concrete UX problem benefits from persona-grounded exploration first, then structured ideation, then cross-industry inspiration for breakthrough ideas.

## Technique Execution Results

### Role Playing - "Be the Barber"

**Interactive Focus:** Walking through a barber's actual day - mid-haircut moments, transition gaps, daily flow
**Key Breakthroughs:**

- **[UX #1]**: Glanceable Next Client - Barber mid-cut only needs name, time, cut. Not price, not status badges.
- **[UX #2]**: Current-First Focus - Flip from "Up Next" hero to "Now Serving" hero. Barber lives in the present.
- **[UX #3]**: Stacked Queue View - Visual priority stack like a deck of cards. Current on top, next below, rest peeking.
- **[UX #4]**: Auto-Focus Timeline - Today's full schedule as a list. Current booking auto-highlighted. No tapping needed.
- **[UX #5]**: Passive Day Progress - Time does the work. 9 AM booking fades at 10 AM. Zero interaction required.

**Core Insight:** Kill the "Up Next" hero card and collapsible schedule. Replace with ONE unified view where the current booking stands out naturally.

### SCAMPER Method

**S - Substitute:**
- **[#6]**: Substitute Price with Duration - "30 min" is more useful than "₱350" mid-day
- **[#7]**: Substitute Status Badge with Countdown - "Arrives in 15 min" instead of "confirmed"

**C - Combine:**
- **[#8]**: Schedule + Customer Notes - "prefers skin fade, sensitive scalp" right on the card
- **[#9]**: Schedule + Delay Indicator - "running 10 min late" auto-detected
- **[#10]**: Schedule + Walk-in Slots - Empty gaps shown as "11:00-11:30 OPEN"

**A - Adapt:**
- **[#11]**: Google Calendar's "Now" Line - Red horizontal line showing current time position (SELECTED)
- **[#12]**: Uber Driver Queue - Current ride big, next ride small, "3 more trips" counter
- **[#13]**: Restaurant Kitchen Ticket Rail - Horizontal scrollable strip at station

**M - Modify:**
- **[#14]**: Now-Line + Auto-Focus Combo - Line shows WHERE, focus shows WHAT
- **[#15]**: Card Size by Proximity - Closer to "now" = physically larger cards
- **[#16]**: Buffer Zone Health - Green/amber/red zones between bookings showing pace

**P - Put to Other Uses:**
- **[#17]**: Timeline as Earnings Tracker - Running total "₱850 earned today"
- **[#18]**: Timeline as Client History - "last visit: 3 weeks ago - same fade" (SELECTED)
- **[#19]**: Timeline as No-Show Predictor - Subtle indicator for unreliable customers

**E - Eliminate:**
- **[#20]**: Eliminate Separate Bookings Tab - Timeline IS the booking view
- **[#21]**: Eliminate Status Badges - Now-line + fading handles status visually

**R - Reverse:**
- **[#22]**: Bottom-to-Top Flow - Current booking always centered on screen

### Cross-Pollination

- **[#23]**: Hospital ER Triage Board - Ambient always-on tablet display at station
- **[#24]**: Fast Food KDS "Bump" - One-tap "Done" to advance to next client
- **[#25]**: Airline Gate Agent Screen - "4 of 7 clients done" progress counter (SELECTED)
- **[#26]**: Spotify Queue - Now Playing pattern with visual anchor
- **[#27]**: Fitness App Countdown - Estimated time remaining with gentle nudge
- **[#28]**: Kanban Swipe - Swipe left to complete, next slides in
- **[#29]**: Racing Game HUD - Day as a race with pit stop indicators

## Idea Organization and Prioritization

### Thematic Organization

| Theme | Ideas | Pattern |
|-------|-------|---------|
| Core Timeline Experience | #4, #5, #11, #14, #15 | Auto-updating schedule with time-based visual anchors |
| Glanceable Information | #1, #2, #6, #7 | Minimal, workflow-relevant data per booking |
| Intelligence Layer | #8, #9, #16, #18, #19 | Context and awareness baked into the timeline |
| Day Awareness | #10, #17, #25 | Progress, gaps, and earnings visibility |
| Interaction Patterns | #20, #21, #24, #28 | Simplify or eliminate manual interactions |

### Prioritization Results - "Smart Timeline"

| Priority | Idea | Description |
|----------|------|-------------|
| 1 | Auto-Focus Timeline + Now-Line (#14) | Today's schedule with red time marker. Booking below line auto-focuses. Past bookings fade gray. |
| 2 | Day Progress Counter (#25) | "4 of 7 clients done" + optional "running X min behind" |
| 3 | Client Last-Visit Note (#18) | On focused card: "Last visit: 3 weeks ago - skin fade" |

**These three replace** the "Up Next" gradient hero card AND the collapsible "Today's Schedule" section with ONE unified Smart Timeline.

### Action Plan

**Implementation Steps:**

1. Replace "Up Next" card + collapsible schedule with single auto-focus timeline list in Overview tab
2. Add red "now" line that moves based on current time
3. Auto-highlight booking below the now-line (larger card, name + time + cut + duration)
4. Fade completed bookings above the line to gray
5. Add "X of Y done" progress counter at top
6. Query customer's last booking with this barber and display on focused card

**Backend Needs:**
- Query for customer's last booking with this barber (service name, date)
- Today's bookings already available via `getBookingsByBarberAndDate`
- No new tables needed - all data exists in bookings table

## Session Summary and Insights

**Key Achievements:**

- 29 ideas generated across 3 complementary techniques
- Clear convergence on "Smart Timeline" concept from role-playing insight
- 3 prioritized features that form a cohesive, implementable unit
- Zero new backend tables required - builds on existing data

**Breakthrough Moment:** The realization that the current "Up Next" card and "Today's Schedule" are solving the same problem separately. Merging them into one auto-focus timeline with a now-line is simpler AND more powerful.

**Session Reflections:** Role Playing grounded the exploration in real barber workflow. SCAMPER systematically expanded the solution space. Cross-Pollination (Google Calendar now-line, airline progress counter) provided the proven UI patterns to anchor the implementation.
