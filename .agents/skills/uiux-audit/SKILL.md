---
name: uiux-audit
description: >
  Use when asked to audit a codebase for UI/UX problems, design inconsistencies, user flow
  breakdowns, or interface clutter. Triggers: "audit my UI", "review my UX", "find design
  inconsistencies", "check my user flows", "audit my frontend", "UX review", "is my interface
  consistent?". Discovers and inventories every real frontend file first, traces actual user
  flows, and produces a structured finding report. Maintains two artifacts: `uiux_audit.md`
  (status/findings) and `audit_traces.md` (flow traces). NEVER guesses file paths — confirms
  every file exists before auditing it. Audits only — does NOT fix, rewrite, or refactor.
  Do NOT use for backend reliability, security, performance profiling, WCAG compliance, or SEO.
---

# UI/UX Audit Skill

## Core Philosophy
Trace real user flows end-to-end. Bad UI/UX is an accumulation — a button labeled "Submit" on one screen and "Continue" on the next, a spinner on three flows and nothing on the fourth — that compounds into an interface users don't trust. Avoid over-flagging (every spacing inconsistency as HIGH) and surface-only scanning (reading only the landing page). The worst debt lives in secondary screens, error states, and edge-case flows nobody demos.

## Read-Only Constraint
This skill never writes code, diffs, or before/after snippets. Every finding ends with a plain-English **Recommendation** describing what should change and why. If you find yourself writing JSX, CSS, or any implementation — stop. Delete it. Replace with a description of the problem and desired outcome.

---

## What Counts as a Flow
A flow **must** start at an entry point (landing page, dashboard link, deep-link), pass through all intermediate screens, modals, and conditional states, and **end at a terminal state** (success confirmation, redirect, or error recovery). Auditing a component in isolation is an audit failure.

---

## Phase 0 — Discover the Real Project (Mandatory)

**Do not open any component until Phase 0 is complete. Do not guess file paths.**

### 0-A. Build the Real File Inventory
1. Read the project root. Note every directory and config file. Open every directory — do not assume its contents.
2. Locate the frontend root: `src/`, `app/`, `pages/`, `views/`, `frontend/`, `client/`, `web/`, `ui/`, `components/`. In a monorepo, find all frontend packages.
3. Recursively list all files in every frontend directory. For each file record: full relative path, file type (`.tsx`, `.jsx`, `.vue`, `.svelte`, `.css`, `.scss`, etc.), and a one-line inferred role from name/location.
4. Count total files: `git ls-files --cached --others --exclude-standard <frontend-dir> | wc -l`. Record as **Total Discovered Frontend Files**.

Write every discovered file into the **File Inventory** section of `uiux_audit.md`. You will only audit files listed here. Never audit a file not in the inventory.

> If you cannot list a directory's contents, say so explicitly. Never fabricate a path.

### 0-B. Identify the Design System (or Its Absence)
Read these landmark files if they exist:

| File | What it tells you |
|---|---|
| `package.json` | UI library in use (MUI, Chakra, shadcn, Tailwind, etc.) |
| `tailwind.config.*` | Custom color, spacing, typography tokens |
| `theme.*`, `tokens.*`, `variables.css` | Official design tokens |
| `components/` or `ui/` folder | Shared component library and contents |
| `globals.css`, `app.css` | Global style overrides that may conflict |

Record in **Design System Profile**. If no design system exists, note it — every consistency finding will be systemic by default.

### 0-C. Map the User Flows
Read the routing layer to understand what screens exist and how they connect: `App.tsx`, `router.tsx`, `routes/index.*`, `pages/` or `app/` directories, `navigation/`, `sidebar.*`, `header.*`.

Build a **User Flow Map** — a numbered list of every distinct flow:
```
Flow 1: Onboarding     → Landing → Sign Up → Verify Email → Dashboard
Flow 2: Authentication → Sign In → Dashboard / Forgot Password → Reset
Flow 3: Core Feature   → Dashboard → Feature Entry → [Steps] → Confirmation
Flow 4: Settings       → Profile → Edit → Save
Flow 5: Error Recovery → Any screen → Error State → Recovery Action
```
Audit order: highest-traffic first, error states last. If traffic is unknown, follow router registration order.

### 0-D. Calibrate the Baseline
Silently read one complete flow without writing any findings. Ask: How visually consistent is this flow? Does the interaction feel deliberate or ad-hoc? Are there signs of multiple authors? Any obviously unfinished screens in production paths? This baseline determines whether a finding is isolated or systemic — systemic findings are always higher severity.

---

## Phase 1 — Initialize `uiux_audit.md`

Create before auditing any file. Update after every file read.

```markdown
<!-- FINAL SUMMARY prepended here on completion -->

# UI/UX Audit — Progress

## Artifacts
- **Findings Log**: `uiux_audit.md`
- **Execution Traces**: `audit_traces.md`

## Current Status
| Field | Value |
|---|---|
| **Status** | Phase 0 — Discovering Files / Auditing Flow N of [Total] / ⛔ Terminated |
| **Files Discovered** | X |
| **Files Audited** | Y / X (Z%) |
| **Flows Completed** | Z / [Total] |

## File Inventory
_(Populated in Phase 0-A. Never modified after Phase 0 except marking ✅.)_

| # | Path | Type | Role (inferred) | Audited? |
|---|---|---|---|---|
| 1 | `src/pages/Login.tsx` | TSX | Authentication screen | ✅ |

**Total Discovered: X | Total Audited: Y**

## Design System Profile
- **UI Library / Framework:**
- **CSS Approach:**
- **Design Tokens defined:**
- **Shared Component Library:**
- **Official Brand/Style Reference:**

## User Flow Map
| Flow # | Name | Entry Point | Terminal Screen | Files Involved |
|---|---|---|---|---|

## Execution Queue
### ✅ Completed Flows
### 🔍 Current Flow: `FLOW-NNN` — [Description]
_(Strike through audited files; mark next with `← NEXT`)_
### ⏭️ Upcoming Flows

## Audit Log
_(Append-only)_
```

### Document Mutation Rules
| Section | Rule |
|---|---|
| Current Status | Overwrite on every file read |
| File Inventory | Mark rows ✅ as audited; never delete or add rows after Phase 0 |
| Design System Profile / Flow Map | Fill once; overwrite with `*(revised)*` if corrected |
| Execution Queue | Strike through completed files; never delete entries |
| Audit Log | Append-only; only update to escalate severity or expand blast radius |

---

## Phase 1.5 — Initialize `audit_traces.md`

```markdown
# UI/UX Audit — Flow Traces
### 🔍 Trace — FLOW-001: [Description]
```

Rules: Every trace needs a unique Flow ID. Log every screen transition with the component and logic traced. Never read the full file if >100 lines — grep the Flow ID and read a 50-line window.

---

## Phase 2 — Conduct the Audit

For each flow, read every involved component (confirmed in File Inventory). After each file: mark ✅ in inventory, update `audit_traces.md`, strike through in Execution Queue, increment Files Audited. Apply all eight dimensions to every file.

### The Eight Audit Dimensions

**1 — Visual Consistency**
- Typography: heading levels, font sizes, and weights used consistently across screens
- Colors: drawn from design token set, no unexplained hard-coded hex values
- Spacing: values follow a consistent scale (multiples of 4px/8px or defined tokens)
- Iconography: one library only; sizes consistent per semantic role
- Button variants: primary = primary action, ghost = secondary, destructive = red — applied uniformly
- Border radius and shadow/elevation consistent across cards, modals, tooltips

**2 — User Flow Coherence**
- CTA labels: the same action has the same label on every screen
- Multi-step flows: user always knows their position and how many steps remain
- Back navigation: consistent pattern (browser back, in-app button, breadcrumb) everywhere
- Destructive actions: always gated by a confirmation step with a cancel option
- Success states: always shown after a completed action; same pattern (toast/banner/redirect) throughout
- Form submission: consistent trigger (Enter key / button); validation fires before submit; validation placement consistent

**3 — Loading & Async State Handling**
- Every async data fetch has a visible loading indicator
- Loading indicator type (spinner / skeleton / shimmer) consistent across the app
- No empty-then-layout-shift caused by missing skeleton or placeholder
- Infinite scroll and pagination not mixed without clear intent

**4 — Empty States**
- Every list, table, feed, and dashboard widget has an explicit empty state
- Empty state includes an actionable next step — not just "No results found"
- Empty state visual pattern (illustration + heading + CTA) consistent across the app

**5 — Error States & Validation**
- Inline validation: field errors shown below the field in consistent color and iconography
- Error message voice: consistent tone across all forms ("Invalid email" vs "Please enter a valid email" — pick one)
- Page-level errors: always include a retry action; never just go blank
- Errors are contained at the component level where possible — not crashing the whole page

**6 — Responsive & Adaptive Behavior**
- Same breakpoints used everywhere; no component defining its own custom breakpoints
- Navigation adapts consistently at the mobile breakpoint (hamburger / bottom bar / sidebar)
- All interactive elements meet 44×44px touch target minimum on mobile
- No content overflow, overlap, or disappearing elements at narrow widths
- Modals that are center-screen on desktop consistently become bottom sheets or full-screen on mobile

**7 — Information Hierarchy & Clutter**
- One dominant primary action per screen; no more than 2–3 primary CTAs visible simultaneously
- Progressive disclosure used where information density is high
- No redundant labels that describe what is already visually obvious from context
- Icon-only actions have tooltips or accessible labels; not ambiguous to new users

**8 — Interaction & Feedback Consistency**
- All interactive elements have hover states consistent in style
- Keyboard focus rings visible and consistent
- Buttons give immediate visual feedback on click
- Page transitions and micro-animations consistent in duration and easing
- Toasts and notifications always appear in the same position with the same auto-dismiss duration

---

## Severity Rubric

| Severity | Condition |
|---|---|
| **CRITICAL** | A user cannot complete a core task. Flow is broken or misleading in a way that causes failure, data loss, or irrecoverable confusion. |
| **HIGH** | Significant friction causing measurable abandonment or repeated errors on a high-traffic flow. |
| **MEDIUM** | Noticeable inconsistency or clutter that degrades trust but does not block task completion. |
| **LOW** | Minor cosmetic deviation from the design system with no user impact. |

**Systemic escalation rule**: same dimension failing in 4+ files → escalate one level. State the files and reason explicitly. Do not escalate a LOW that still has no user impact regardless of how many files it appears in.

---

## Finding Template

```markdown
### [CRITICAL | HIGH | MEDIUM | LOW] — <Short, specific title>

| Field | Detail |
|---|---|
| **Issue ID** | `ISSUE-NNN` |
| **Flow** | Flow N: [Name] → `entry screen` → `terminal screen` |
| **Files** | `src/pages/Screen.tsx`, `src/components/Widget.tsx` |
| **Dimension** | Visual Consistency / Flow Coherence / Loading States / Empty States / Error States / Responsive / Information Hierarchy / Interaction Feedback |
| **Systemic?** | Yes — also in `FileA`, `FileB` / No |

**The Problem**
What is wrong and why it creates friction or confusion. Name the screen, the element, and the conflicting behavior. No code — plain English only.

**User Impact**
What does this cause the user to experience? (Confusion, hesitation, abandonment, inability to complete a task, inability to recover from an error.) How many screens or flows are affected?

**Recommendation**
Plain English only. What should change and why. If systemic, describe the single principle to apply across all listed files.
```

---

## Flow Trace Template

```markdown
### 🔍 Trace — FLOW-NNN: [Short Description]

| Field | Detail |
|---|---|
| **ID** | `FLOW-NNN` |
| **Status** | In Progress / Trace Completed |
| **Entry Point** | `pages/Login.tsx` |

| Step | File | Element / Logic | Action taken |
|---|---|---|---|
| 1 | `pages/Login.tsx` | Login form, submit CTA | Checked label, validation feedback, loading state |
| 2 | `components/AuthModal.tsx` | Modal wrapper | Checked mobile behavior, close affordance |
| 3 | `pages/Dashboard.tsx` | Post-login redirect | Checked success state, first-load empty state |

**What we were doing:** [2–3 sentences on the user journey simulated and UX concerns tested.]
```

---

## Audit Budget & Termination

| Limit | Default |
|---|---|
| Max Flows | 6 complete user flows |
| Max Files | `max(30, 10% of Discovered Files)` |
| Dead End | All discovered files audited |

When any limit is hit, stop and write the Final Summary.

---

## Final Summary Block

Prepend to top of `uiux_audit.md` when any limit is reached:

```markdown
<!-- ══════════════════════════════════════════════════════════════════ -->
## ⛔ FINAL SUMMARY — UI/UX Audit Complete

**Terminated by:** Max Flows / Max Files / All Files Audited
**Files discovered:** X | **Audited:** Y / X (Z%) | **Flows completed:** Z / [total]

### Overall UX Health: 🔴 Broken / 🟠 High Friction / 🟡 Moderate / 🟢 Polished
_(One paragraph: most damaging finding and the user behavior it causes; most pervasive inconsistency and how many files it affects; dimension with highest finding density; isolated vs. systemic pattern.)_

### Finding Counts
| Severity | Count |
|---|---|
| CRITICAL | N |
| HIGH | N |
| MEDIUM | N |
| LOW | N |
| **Total** | **N** |

### Dimension Breakdown
| Dimension | Count | Most Affected Flow |
|---|---|---|
| Visual Consistency | N | Flow X |
| Flow Coherence | N | Flow X |
| Loading & Async | N | Flow X |
| Empty States | N | Flow X |
| Error States | N | Flow X |
| Responsive | N | Flow X |
| Information Hierarchy | N | Flow X |
| Interaction Feedback | N | Flow X |

### Top 5 Issues — In Priority Order
1. **[Screen / Component]** — what it is and what it causes the user to experience
2–5. (same format)

### Files Not Yet Audited
| Path | Type | Why High Priority Next |
|---|---|---|
| `src/pages/Settings.tsx` | TSX | Settings flows not audited; common source of UX debt |
<!-- ══════════════════════════════════════════════════════════════════ -->
```

Then send:
> **Audit complete — [limit] reached.** `uiux_audit.md` contains [N] findings across [Z] flows ([Y] of [X] files audited). Most urgent: [one sentence on the highest-severity finding and its user impact]. Files not reached are listed in the summary for the next session.

---

## Per-File Checklist (run silently before marking any file ✅)

```
VISUAL CONSISTENCY
[ ] Typography uses defined scale — no arbitrary font sizes
[ ] Colors from token set — no unexplained hard-coded hex values
[ ] Spacing follows consistent scale (multiples of 4/8px or tokens)
[ ] One icon library; sizes consistent per semantic role
[ ] Button variants used semantically; border radius and shadows match system

FLOW COHERENCE
[ ] CTA labels match equivalent actions on other screens
[ ] Multi-step flows show current position and total steps
[ ] Back / cancel navigation exists and behaves predictably
[ ] Destructive actions gated by a confirmation step with cancel option
[ ] Success state shown after every completed action; pattern consistent

LOADING & ASYNC
[ ] Every async fetch has a loading indicator
[ ] Loading indicator type consistent with the rest of the app
[ ] No empty-then-layout-shift from missing skeleton

EMPTY STATES
[ ] Every list and data surface has an empty state
[ ] Empty state includes an actionable next step
[ ] Empty state visual pattern consistent with others in the app

ERROR STATES
[ ] Inline validation feedback below each field; consistent color and icon
[ ] Error message tone consistent across all forms
[ ] Page-level errors include a retry action
[ ] Errors contained at component level; do not crash the whole page

RESPONSIVE
[ ] Breakpoints consistent with the rest of the app
[ ] Navigation adapts correctly at mobile breakpoint
[ ] Touch targets meet 44×44px minimum on mobile
[ ] No content overflow or overlap at narrow widths

INFORMATION HIERARCHY
[ ] One dominant primary action per screen
[ ] No more than 2–3 primary CTAs visible simultaneously
[ ] Progressive disclosure used where density is high
[ ] No redundant labels; icon-only actions have tooltips

INTERACTION FEEDBACK
[ ] All interactive elements have hover states
[ ] Keyboard focus rings visible
[ ] Buttons give immediate click feedback
[ ] Animations consistent in timing and easing
[ ] Toasts appear in consistent position with consistent duration
```