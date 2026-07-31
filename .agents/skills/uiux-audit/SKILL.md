---
name: uiux-audit
description: >
  Use when asked to audit a codebase for UI/UX problems, design inconsistencies, user flow
  breakdowns, or interface clutter. Triggers: "audit my UI", "review my UX", "find design
  inconsistencies", "check my user flows", "audit my frontend", "UX review", "is my interface
  consistent?". Traces actual user flows and produces a structured finding report across three
  artifacts: `uiux_backlog.md`, `uiux_traces.md`, and `uiux_progress.md`. NEVER guesses file
  paths — confirms every file exists before auditing it. Audits only — does NOT fix, rewrite,
  or refactor. Do NOT use for backend reliability, security, performance profiling, WCAG
  compliance, or SEO.
---

# UI/UX Audit Skill

## Core Philosophy
Trace real user flows end-to-end. Bad UI/UX is an accumulation — "Submit" on one screen, "Continue" on the next; a spinner on three flows, nothing on the fourth — compounding into an interface users don't trust. Avoid over-flagging (every spacing nit as HIGH) and surface-only scanning (only the landing page). The worst debt lives in secondary screens, error states, and edge-case flows nobody demos.

Every finding is judged against **The Golden Rules of UI Design**: the rules are the standard, the Audit Dimensions are where you look. The audit runs **one flow at a time** and **checkpoints after each**. No fixed flow cap — it runs until the flow queue is exhausted or you pause. State lives in the artifact files, so a fresh session continues from where the last left off.

The audit supports two modes: **checkpoint mode** (pauses after each flow, waits for `continue`) and **continuous mode** (auto-proceeds without pausing). Reply `continuous` at any checkpoint to switch, or `checkpoint` to switch back.

## Output Economy
Write for a reader who scans. Artifacts and chat both use dense fragments, not prose.
- Findings: problem → user impact → recommendation in the fewest unambiguous words.
- Trace/log rows: one line per screen transition; never restate context already on the page.
- Chat at a checkpoint: 2–3 lines — done / next / how to continue. Don't paste the artifact back.
- Fill a template field or omit it.

## Read-Only Constraint
Never write code, diffs, or before/after snippets. Every finding ends with a plain-English **Recommendation**. Catch yourself writing markup/styles → stop, delete, describe the problem and desired outcome instead.

## Technology Neutrality
Framework- and library-agnostic. Describe problems and fixes in terms of user-facing behavior and design principles, never a specific UI library, component name, or styling system. Named control types (dialog, tooltip, toast, banner) are generic interaction patterns, not library components.

---

## What Counts as a Flow
Starts at an entry point (landing, dashboard link, deep-link), passes through all intermediate screens/modals/conditional states, and **ends at a terminal state** (success, redirect, or error recovery). Auditing a component in isolation is an audit failure.

---

## Phase 0 — Discover the Real Project (Mandatory)

**Do not open any component until Phase 0 is complete. Do not guess paths.**

### 0-A. Discover the Frontend Structure
1. Read the project root; open every directory (don't assume contents).
2. Locate frontend root(s) — common names: `src/ app/ pages/ views/ frontend/ client/ web/ ui/ components/`. Monorepo → all frontend packages.
3. Understand the page/screen structure and component hierarchy.

> Can't list a directory? Say so. Never fabricate a path.

### 0-B. Identify the Design System (or its absence)
Detect by category — filenames vary by stack, treat as signals:
| Signal | Typically lives in |
|---|---|
| UI library / framework | the dependency manifest |
| Design tokens (color/spacing/type) | theme / token / CSS-variable files, or a utility-CSS config |
| Shared component library | a components/ui directory |
| Global overrides that may conflict | the global stylesheet(s) |
| Brand / style reference | a design-guidelines doc, if any |

Record in **Design System Profile**. No design system → every consistency finding is systemic by default.

### 0-C. Build the Flow Backlog
Read the routing/navigation layer by role (route defs, top-level app/layout, pages/screens dir, nav/sidebar/header). Build the **Flow Backlog** — the source-of-truth list of all user-facing flows:

```
FLOW-001 Onboarding     → Landing → Sign Up → Verify → Dashboard
FLOW-002 Auth           → Sign In → Dashboard / Forgot → Reset
FLOW-003 Core Feature   → Dashboard → Entry → [Steps] → Confirmation
```

Order: highest-traffic first, error states last; unknown traffic → route registration order. During Phase 2, flows discovered mid-audit (e.g., an undocumented modal path) are **appended** to the backlog.

### 0-D. Calibrate the Baseline
Silently read one full flow, no findings. Ask: consistent? deliberate or ad-hoc? signs of multiple authors? unfinished screens in prod paths? Sets isolated-vs-systemic calibration (systemic ranks higher).

---

## Phase 1 — Initialize `uiux_backlog.md`

Create before auditing any file. The flow queue.

```markdown
# UI/UX Audit — Backlog

| Flow ID | Status | Flow Path |
|---------|--------|-----------|
| FLOW-001 | ⏳ Pending | entry → step → terminal |

Status: ⏳ Pending / 🔍 Current / ✅ Done / ⛔ Dead-end
New flows discovered mid-audit → appended as ⏳ Pending.
```

**Mutation Rules:**
| Section | Rule |
|---|---|
| Flow status | Move from ⏳ → 🔍 → ✅ (or ⛔). Never delete entries. |
| Discovered flows | Append as ⏳ Pending. |

---

## Phase 1.5 — Initialize `uiux_traces.md`

```markdown
# UI/UX Audit — Flow Traces
### 🔍 Trace — FLOW-001: [desc]
| # | File | Element / Logic | Action |
|---|---|---|---|
| 1 | `pages/Login` | form, submit CTA | label, validation, loading |
| 2 | `components/AuthModal` | modal wrapper | mobile behavior, close affordance |
| 3 | `pages/Dashboard` | post-login redirect | success state, first-load empty state |

**Simulated:** [1–2 lines: the journey and UX concern tested.]
```

---

## Phase 1.75 — Initialize `uiux_progress.md`

```markdown
<!-- FINAL SUMMARY prepended here on completion -->

# UI/UX Audit — Progress

## Status
| Field | Value |
|---|---|
| Phase | Phase 0 / Auditing `FLOW-NNN` / ⏸️ Checkpoint / ✅ Queue exhausted |
| Flows done | X / Y |
| Findings | N (🔴 CRITICAL N · 🟠 HIGH N · 🟡 MEDIUM N · LOW N) |
| Last checkpoint | after `FLOW-NNN` |

## Design System Profile
- UI library · Styling approach · Tokens · Shared components · Brand ref

## Findings Log
_(Append-only. Findings reference Flow IDs linked from uiux_traces.)_
```

### Mutation Rules
| Section | Rule |
|---|---|
| Status | Overwrite on every file read |
| Design System Profile | Fill once; overwrite with `*(revised)*` if corrected |
| Findings Log | Append only. Add `**Updated:**` line if severity escalated or blast radius changed. |

---

## Phase 2 — Conduct the Audit

**2-A. Select next flow** — pick first `⏳ Pending` from `uiux_backlog.md`. Mark it `🔍 Current`.

**2-B. Walk the flow** — follow every screen/component in the flow from entry to terminal state. At each step, append a row to `uiux_traces.md` (file | element / logic | action).

**2-C. Write findings** — when a flaw is found, write it to `uiux_progress.md` Findings Log using the Finding Template. Link the finding ID in `uiux_traces.md` Action column. If a new flow is discovered mid-audit, append it to `uiux_backlog.md` as `⏳ Pending`.

**2-D. Checkpoint** — after flow reaches terminal state. See Checkpoints section below.

---

### The Golden Rules of UI Design
The standard the interface is held to. **Every finding cites ≥1 rule it violates** — that citation is how the audit enforces them. Rules 1–8 are the classic set; 9–11 extend it with common usability heuristics.

| # | Principle | Good looks like (illustrative) |
|---|---|---|
| 1 | **Consistency** | Same meaning → same treatment: same icon for a concept, conventional icon choices, uniform terms/labels, recurring controls in the same spot. The token catalog is a start, not the boundary. |
| 2 | **Universal usability** | Novices + experts at once: icon+color for scanning, shortcuts for power users, responsive layout via shared primitives, sensible defaults, legible contrast. |
| 3 | **Informative feedback** | Acknowledge every action — callout/alert/badge, descriptive confirmation ("[noun] [verb]", e.g. "Draft saved"), loading/skeleton states, hover/focus cues. Feedback weight = action weight. |
| 4 | **Closure** | Clear beginning → middle → end; every flow ends with an explicit outcome; confirm completion, don't go silent. |
| 5 | **Prevent errors** | Validate early at the input layer, constrain/format inputs, gate destructive actions behind confirmation, disable/explain unavailable options, always offer a way back. |
| 6 | **Easy reversal** | Prefer reversible affordances; undo where feasible; label the irreversible ("can't be undone") and require deliberate confirmation. |
| 7 | **User in control** | No surprise state changes or hijacked flows; color reinforces named text, never replaces it; user initiates, UI responds. |
| 8 | **Low memory load** | No recall across screens — recognizable icons/labels, consistent placement, visible options over remembered ones, one vocabulary. |
| 9 | **Match the real world** | User's language and real-world conventions; group/order info the way users think; no internal jargon or system-centric labels. |
| 10 | **Aesthetic economy** | Every element earns its place; remove decoration/redundancy/noise; visual weight tracks importance. |
| 11 | **Discoverability & help** | Important actions findable without prior knowledge; non-obvious steps carry lightweight in-context guidance. |

#### Microcopy & Progressive Disclosure
- **Short & actionable.** Scannable, not prose — short imperative phrases. Positive framing by default (what it *does*). When a caveat must not be missed, use direct negative framing + informational/warning/destructive styling. Never stack a benefit and a caveat in one multi-clause sentence.
- **Separate caveat from action.** Label states the action only. Nuance goes separately — a compact status note beside the control, or an on-demand disclosure (tooltip, popover, expandable detail, info dialog) via a small info affordance.
- **Lean on visual/contextual cues.** Copy never works alone — let surrounding view and adjacent controls carry meaning so words stay terse. Icons/color/status convey intent at a glance; add words only where a cue alone is ambiguous. Never restate what layout/label/icon already shows.

---

### The Audit Dimensions

**1 Visual consistency** — typography scale · colors from tokens (no stray hard-coded values) · consistent spacing scale · one icon library, consistent sizes · button variants used semantically · consistent radius/elevation.

**2 Flow coherence** — same action → same CTA label everywhere · multi-step shows position + total · consistent back nav · destructive actions gated + cancelable · success state always shown, same pattern · consistent submit trigger, validation before submit, consistent placement.

**3 Loading & async** — every fetch has a loading indicator · one indicator type app-wide · no empty-then-shift from missing skeleton · no unintentional scroll/pagination mix.

**4 Empty states** — every list/table/feed/widget has one · includes an actionable next step (not just "No results") · consistent visual pattern.

**5 Error states & validation** — inline errors near the field, consistent color/icon · one error voice across forms · page errors include retry (never blank) · errors contained at component level, don't crash the page.

**6 Responsive & adaptive** — one breakpoint set (no per-component custom) · nav adapts consistently at mobile · touch targets ~44px min · no overflow/overlap/disappearing at narrow widths · desktop center-modals become sheets/full-screen on mobile.

**7 Information hierarchy & clutter** — one dominant primary action per screen (≤2–3 primary CTAs visible) · progressive disclosure where dense · no redundant labels · icon-only actions have tooltips/accessible labels.

**8 Interaction & feedback** — consistent hover states · visible, consistent focus rings · immediate click feedback · consistent transition/animation timing+easing · toasts in a consistent position + dismiss duration.

**9 Microcopy & progressive disclosure** — terse imperative copy, one idea per line · positive default, must-not-miss caveats use negative framing + status styling · caveats separated from the action label · icons/color/context carry meaning, no restated cues · one voice/term per concept.

---

## Severity Rubric
| Severity | Condition |
|---|---|
| **CRITICAL** | User can't complete a core task; flow broken/misleading → failure, data loss, or irrecoverable confusion. |
| **HIGH** | Significant friction → measurable abandonment or repeated errors on a high-traffic flow. |
| **MEDIUM** | Noticeable inconsistency/clutter degrading trust, not blocking completion. |
| **LOW** | Minor cosmetic deviation, no user impact. |

**Systemic escalation**: same dimension failing in 4+ files → escalate one level; state files + reason. Don't escalate a zero-impact LOW on frequency alone.

---

## Finding Template
```markdown
### [CRITICAL|HIGH|MEDIUM|LOW] — <specific title>
| | |
|---|---|
| Issue | `ISSUE-NNN` |
| Flow | Flow N: [name] `entry`→`terminal` |
| Files | `pages/Screen`, `components/Widget` |
| Dimension | Visual / Flow / Loading / Empty / Error / Responsive / Hierarchy / Interaction / Microcopy |
| Golden rule | #N — [name] |
| Systemic | Yes (`FileA`,`FileB`) / No |

**Problem** — screen, element, conflicting behavior. Plain English, no code.
**User impact** — what the user experiences + how many screens/flows.
**Recommendation** — plain English, behavior + principle, never a library/component. Systemic → the one principle to apply across listed files.
```

---

## Flow Trace Template
```markdown
### 🔍 Trace — FLOW-NNN: [desc]
| # | File | Element / Logic | Action |
|---|---|---|---|
| 1 | `pages/Login` | form, submit CTA | label, validation, loading |
| 2 | `components/AuthModal` | modal wrapper | mobile behavior, close affordance |
| 3 | `pages/Dashboard` | post-login redirect | success state, first-load empty state |

**Simulated:** [1–2 lines: the journey and UX concern tested.]
```

---

## Checkpoints (no fixed budget)
No max-flows cap; checkpoint at natural boundaries so the run is pausable/resumable. Triggers:
```
flow reaches terminal state   → CHECKPOINT (flow done)
user pause / context long     → CHECKPOINT
flow queue empty              → CHECKPOINT + Final Summary
```
At every checkpoint: flush both files; mark flow `✅ Done` (or `⛔ Dead-end`) in backlog; set next `⏳ → 🔍`; Status → `⏸️ Checkpoint`; emit checkpoint line. In **checkpoint mode**: stop and wait for user. In **continuous mode**: auto-proceed to next flow (loop back to 2-A).

**Checkpoint line:**
> **Checkpoint — `FLOW-NNN` done.** [N] findings · [Y]/[X] flows. Top: [one line + impact]. Next: `FLOW-NNN`. Reply **continue**, or `continuous` to auto-proceed, or resume from `uiux_backlog.md`.

---

## Final Summary Block
Prepend to top of `uiux_progress.md` when the queue is exhausted or the user ends at a checkpoint.
```markdown
<!-- ════════════════════════════════════════════════════════ -->
## ⛔ FINAL SUMMARY
Reason: Queue exhausted / User ended
Flows done: Y / X

### UX Health: 🔴 Broken / 🟠 High Friction / 🟡 Moderate / 🟢 Polished
_(one paragraph: worst finding + behavior it causes; most pervasive inconsistency; highest-density dimension; most-violated rule; isolated vs. systemic)_

### Counts  CRITICAL N · HIGH N · MEDIUM N · LOW N · **Total N**

### By dimension  Visual N · Flow N · Loading N · Empty N · Error N · Responsive N · Hierarchy N · Interaction N · Microcopy N
### By golden rule  #1 N · #2 N · … (top violators)

### Top 5  1–5: `[screen]` — what it is + user experience
<!-- ════════════════════════════════════════════════════════ -->
```
Then send:
> **Audit complete — queue exhausted.** [N] findings · [Y]/[X] flows. Most urgent: [one line + impact]. Unaudited flows in `uiux_backlog.md`.

---

## Resuming
State lives in the artifact files. A fresh session reads `uiux_backlog.md` + `uiux_traces.md` + `uiux_progress.md`, re-reads Design System Profile + Golden Rules, resumes at the `🔍 Current` flow in the backlog, and skips completed flows.

---

## Audit Checklist
```
VISUAL       type scale · tokened colors · spacing scale · one icon set · semantic variants + radius/shadow
FLOW         matching CTA labels · step position · predictable back/cancel · gated+cancelable destructive · consistent success
LOADING      indicator per fetch · consistent type · no empty-then-shift
EMPTY        every data surface · actionable next step · consistent pattern
ERROR        inline near field · one voice · page-error retry · component-contained
RESPONSIVE   shared breakpoints · nav adapts · ~44px targets · no overflow/overlap
HIERARCHY    one primary action · ≤2–3 primary CTAs · disclosure where dense · labeled icon-only actions
INTERACTION  hover states · focus rings · click feedback · consistent animation · consistent toasts
MICROCOPY    terse imperative · positive default (negative for must-not-miss + status style) · caveat separated · cues over words · one term/concept
GOLDEN RULE  every finding cites ≥1 violated rule (#1–#11)
```

---

## Project-Level Conventions

### Plans & Artifacts Folder
Place all plan documents and audit artifacts inside a dedicated folder at the project root that is gitignored. The recommended names are `.artifacts/` or `.scratch/` (add to `.gitignore`).

### Sub-Agent Usage
For broad exploration tasks (finding files, understanding file patterns, searching code), use a sub-agent with the minimum-cost model available to avoid context rot and preserve budget for the main task. For large repetitive refactors (e.g., renaming a function across 20+ files, updating the same pattern in many modules), delegate to a sub-agent with clear per-file instructions and a checkpoint after every batch. Verify each batch's output before starting the next.
```