---
name: uiux-fix
description: >
  Use after a UI/UX audit to implement fixes. Triggers: "implement the audit fixes", "fix the
  UI issues found", "apply the UX remediations", "start fixing the design issues", "fix the
  design inconsistencies". Reads findings from uiux_audit.md, builds a structured plan, gets
  approval, then executes one fix at a time with a checkpoint after every change.
  Do NOT edit files before plan approval. Do NOT run a new audit — that is the uiux-audit skill's job.
depends_on: uiux-audit
---

# UI/UX Fix Skill

## Core Philosophy
Plan first, get approval, then execute one fix at a time. UI/UX changes have a blast radius across tokens, component variants, breakpoints, theming, and accessibility contracts. The user knows things the audit doesn't — a visual inconsistency may be intentional brand expression, an accessibility deviation may have an approved exception, a proposed component swap may conflict with a design-system migration in progress. Surface that before touching any file.

Runs **one fix at a time** with a **checkpoint after every change**. Supports **checkpoint mode** (pauses after each fix, waits for `continue`) and **continuous mode** (auto-proceeds without pausing). Reply `continuous` at any checkpoint to switch modes. No batch mode. State lives in `uiux_fix_plan.md`, so a fresh session resumes from the plan alone — without losing the approval gate or re-applying a done fix.

## Output Economy
Write for a reader who scans. Plan and chat updates use dense fragments, not prose.
- Approach Details: one tight line per aspect (what changes / accessibility ref / what stays / risk).
- Execution Log entries: bullets, not paragraphs.
- Chat at a checkpoint: 3 lines — done / next + approach / prompt. Don't paste the plan back.
- Announce blocks (3-A): the fixed lines, nothing more.

## Technology Neutrality
Framework- and library-agnostic. Fixes use the *project's own* tokens, variants, and accessibility semantics; describe them in terms of design-system constructs and user-facing behavior, never a specific library's component API, and never a raw value when a token exists. Named patterns (token, variant, focus ring, dialog, role/label) are generic. Accessibility criteria (e.g. WCAG) are a standard, not a library — cite one when the audit provided it.

---

## Artifacts
- **`uiux_fix_plan.md`** — single source of truth: Design System Patterns, Fix Inventory (per-fix status), Approach Details, Execution Order, append-only Execution Log. Everything a resuming session needs is here.
- **`uiux_audit.md`** — read-only input; only annotated with `✅ FIXED` / `⏭️ DEFERRED` prefixes.
- **`walkthrough.md`** — final summary, created once all fixes complete.

> No separate task tracker. Per-fix state = the Fix Inventory **Status** column; next fix = the first `Pending` item in Execution Order.

---

## Pre-Flight Check
1. **Resume?** If `uiux_fix_plan.md` already exists → go to **Resuming**, not Phase 0.
2. **Fresh start?** Read `uiux_audit.md`. If it doesn't exist or has no Audit Log entries, stop:
   > "No UI/UX audit findings found. Run the uiux-audit skill first, then return here."

---

## The Five Phases
| Phase | Name | Hard stop? |
|---|---|---|
| 0 | Ingest & understand | — |
| 1 | Build `uiux_fix_plan.md` | — |
| 2 | Present for review | ⛔ no file touched until explicit approval |
| 3 | Execute → checkpoint → repeat | ⛔ stops after every fix (continuous mode skips the wait) |
| 4 | Finalize `walkthrough.md` | — |

---

## Phase 0 — Ingest & Understand

**0-A. Read audit findings.** Per finding, extract: severity, dimension, file(s)/component(s), systemic flag, any `**Updated:**` blocks, and any accessibility criterion the audit attached (e.g. WCAG `1.4.3 AA`) — accessibility findings must never be *silently* deferred. Copy **Design System Patterns** verbatim — every fix matches it.

**0-B. Targeted read for planning — not whole files.** Per finding, read only what's needed to write a correct approach:
- the flagged region + the tokens/variables/theme values it already uses (use these, never raw values)
- which component variants exist (a fix must not silently break an untested variant)
- accessibility semantics present (roles, labels, semantic elements — altering these is a separate risk surface from visual changes)
- whether a visual-snapshot or component-story test exists (avoid unintended visual regression)
- whether the component is shared across pages (wider blast radius than it looks)

Don't slurp whole files, and don't trust the audit snippet alone. Widen only when the approach needs it. The authoritative fresh read happens at execution (3-B), only for fixes that run.

**0-C. Map dependencies.** Token/variable defs before consumers · shared components before page-level overrides · base type/spacing scale before individual fixes · breakpoint values before layout rules that use them · **accessibility fixes before cosmetic** (never regress accessibility in an aesthetic pass) · systemic findings as a group.

**0-D. Draft an approach per fix.** Decide: exact lines/selectors/props/attributes, which design-system construct (exact token, variant, accessibility pattern, breakpoint var), any new token/import, the accessibility criterion satisfied if applicable, what could go wrong. → **Approach Details**, the review surface.

---

## Phase 1 — Build `uiux_fix_plan.md`

```markdown
# UI/UX Fix Implementation Plan
> Status: Draft — Awaiting Review · Source: `uiux_audit.md` · Updated: [what/why]

## Design System Patterns (from audit)
- Design system / component lib · Color tokens · Spacing scale · Type scale · Breakpoints · Icon set · Theming approach · Accessibility target

## Fix Inventory
| ID | Issue(s) | Sev | Title | File(s)/Component(s) | Category | Depends on | Status |
|---|---|---|---|---|---|---|---|
| FIX-001 | ISSUE-001 | 🚨 | Missing focus indicator | `Button`, `Input` | Accessibility | — | Pending |
_(Status: Pending / ✅ Done / ⚠️ Partial / ⏭️ Deferred)_

## Approach Details
_(one subsection per fix — the review surface)_
### FIX-001 — [title]
- File(s): `path`
- Accessibility: [criterion, e.g. WCAG 2.4.7 AA] / —
- Approach: what changes, which token/variant/role/element/rule
- Unchanged: appearance of unrelated elements, props, validation logic
- Risk: theming conflict, specificity clash, form-layer override → how handled

## Execution Order
_(system/token fixes → accessibility by severity → cosmetic; explain non-obvious ordering)_
1. FIX-NNN — reason

## Deferred / Excluded
_(empty until review)_

## Execution Log
_(append-only)_

## Verification Plan
- Visual check at all relevant breakpoints per fix.
- Keyboard + assistive-tech pass for every accessibility fix.
- Tokens resolve correctly across themes (e.g. light/dark).
- Run snapshot tests where present; confirm diffs are intentional.
```

Plan ends Phase 1 with **Status: Draft — Awaiting Review**.

---

## Phase 2 — Present for Review (Hard Stop)

Present `uiux_fix_plan.md`. Your message:
1. **Headline** — counts by severity, plus how many carry an accessibility criterion.
2. **Order rationale** — one line for the first two decisions, esp. why token-level lands before component-level.
3. **Point at Approach Details:**
   > "Approach Details says exactly what each fix does — which token, which accessibility pattern, which element/rule, which lines. Read each before I write a line of code. Wrong token name, an accessibility pattern your team prefers, or an exception already approved for this element? Catch it now."
4. **Gating questions:** Any to skip? defer? change approach?
5. **Prompt:** *"Reply 'approved' to begin, or share feedback and I'll revise first."*

**On approval:** set plan header **Status → ✅ Approved**. Only this transition unlocks source edits — here or on any future resumed session.

### Handling Feedback — one operation per item
| User says | Operation |
|---|---|
| "Skip FIX-X, intentional" | → Deferred/Excluded w/ reason |
| "Defer FIX-X till after the DS migration" | → Deferred/Excluded w/ reason |
| "Do FIX-X before FIX-Y" | Reorder Execution Order; note reason |
| "Use approach X not Y — our base styles override Y" | Update Approach Details; mark *(user-revised)* |
| "The token is `focus-ring` not `color-focus-ring`" | Update Design System Patterns *(user-corrected)* + every Approach Details using the old name |
| "FIX-X also needs to work on the brand background" | Add the extra contrast check to Approach Details; mark *(user-revised)* |
| "Add a fix for X" | Add to Inventory + Approach Details + Execution Order |

Set Status `Revised — Awaiting Approval`; list changes in Updated; re-present. Repeat until explicit approval. **Silence ≠ approval.**

---

## Phase 3 — Execute, Checkpoint, Repeat

Two modes: **checkpoint mode** (pauses after each fix) and **continuous mode** (auto-proceeds without pausing). Default is checkpoint mode. Reply `continuous` at any checkpoint to switch, or `checkpoint` to switch back.

### 3-A. Announce (before touching files)
```
Applying FIX-003 — [title] (ISSUE-NNN)
Files: path  ·  a11y: [criterion] / —
Approach: [one line, as approved]
(no other files touched)
```

### 3-B. Apply
First **re-read the target region fresh** so the patch is against current state, not the Phase-0 snapshot — matters most across sessions. If the file drifted from what Approach Details assumed, pause and flag before editing.
Then edit only this fix's files. Must: match Approach Details exactly · use only project tokens/variants/accessibility semantics — never a raw color/size/spacing value when a token exists · not change appearance of unnamed elements · not alter accessibility semantics beyond what the fix specifies · not add deps without announcing in 3-A.
After editing, read the file back: no syntax error · the referenced token/role/element actually exists · no unintended adjacent line changed.

### 3-C. Update artifacts (after every fix)
1. Append to Execution Log:
```markdown
### ✅ FIX-NNN — [title] (ISSUE-NNN)
- Files: `path`
- Done: [elements/tokens/attributes changed]
- a11y: [criterion satisfied] / —
- Unchanged: [appearance, props, unrelated logic]
- Tests: [snapshot updated / pass / gap]
- Deviation: None / [what + why]
```
2. Set Fix Inventory Status → `✅ Done` (that + Execution Order is the resume pointer).
3. In `uiux_audit.md`, prepend `✅ FIXED — ` to the finding title. For deferrals: prepend `⏭️ DEFERRED — `, replace Recommendation with a **Deferred Reason**, add the legend once:
```markdown
## Audit Legend
- `✅ FIXED` — resolved · `⏭️ DEFERRED` — acknowledged, out of scope this run
```

### 3-D. Checkpoint (after every single fix)
```
Checkpoint — FIX-003 done. Next: FIX-004 — [title] (`file`), approach: [one line]. a11y: [criterion]/—
Reply 'continue' / 'pause' / 'continuous' — or feedback to adjust before the next fix.
```
In **checkpoint mode**: stop. Do not proceed until the user responds. In **continuous mode**: auto-proceed to next fix (loop back to 3-A). The next `Pending` fix is the resume point.

### 3-E. Checkpoint responses
| User says | Action |
|---|---|
| continue / yes | apply next → 3-A |
| continuous | switch to continuous mode; auto-proceed to next fix (3-A) |
| pause / stop | write Pause Summary (3-G); Status → ⏸️ Paused; stop |
| skip this one | → Deferred/Excluded; announce new next; wait |
| change approach to X | update Approach Details *(user-revised)*; re-announce (3-A); wait |
| add this fix first | add to Inventory + Approach Details + Execution Order; announce; wait |

### 3-F. Finalize
All fixes done → Status → `✅ Complete`; create `walkthrough.md`: changes made, accessibility criteria resolved, visual/accessibility tests run, follow-up gaps, final state.

### 3-G. Pause Summary
Prepend to `uiux_fix_plan.md`:
```markdown
<!-- ════════════════════════════════════════════════════════ -->
## 📋 UI/UX Implementation Summary — Paused / Complete
Fixes done: N / M · Accessibility findings resolved: N / M

### Applied
| ID | Title | File(s) | a11y | Issue(s) | Deviation? |
### Remaining
| ID | Sev | Title | Issue(s) | Reason not applied |
### Deferred
| ID | Title | Issue(s) | Reason |
### Follow-up gaps (noticed, not in original audit)
- `file` — [what + related accessibility criterion if any]

### Resume
New session → say "resume the UI/UX fixes". Plan Status + Fix Inventory show the state;
work starts at the first `Pending` fix. (Never edit source unless Status = Approved.)
<!-- ════════════════════════════════════════════════════════ -->
```

---

## Resuming
State lives in `uiux_fix_plan.md`. A fresh session: read it → confirm header **Status = Approved** (if Draft/Revised, re-present for review — **never edit source on an unapproved plan**) → resume at the first `Pending` fix in Execution Order via 3-A. Skip anything `✅ Done`. If Status = Complete, offer the walkthrough. If the plan is missing, this isn't a resume — run Pre-Flight.

---

## Rules a Fix Must Never Break
| Rule | Why |
|---|---|
| No source edit on resume unless header Status = Approved | Approval gate must survive a context reset |
| One fix per edit | Mixing makes visual regressions and accessibility failures untraceable |
| No deviation from approved Approach Details without announcing | Silent deviation breaks the review contract |
| No raw color/size/spacing value when a token exists | Hard-coded values break on theme switch or the next DS update |
| No accessibility semantics altered beyond the fix's scope | Roles/labels/semantic elements have a wider blast radius than they look |
| No visual change to elements not named in the fix | Unplanned tweaks bypass the safety model |
| No new dependency without announcing in 3-A | Affects the whole project |
| No "Done" on a partial fix | Mark ⚠️ Partial; note what remains |
| Never skip the checkpoint | Trivial-looking style fixes have caused regressions |
| Record the accessibility criterion where the audit provided one | Traceability for compliance reporting |
| Never regress accessibility with a later cosmetic fix | Accessibility must monotonically improve — cosmetic fixes must not override focus styles, contrast, or semantics restored earlier |
| Re-read the target region fresh before editing | Files drift between plan and execution |
| Read the changed file back after editing | Verify no syntax error, no stray adjacent change, referenced token exists |
| Only prepend `✅ FIXED`/`⏭️ DEFERRED` to `uiux_audit.md` | Altering audit data destroys the record |

---

## `uiux_fix_plan.md` Mutation Rules
| Section | Rule |
|---|---|
| Status / Updated | Overwrite on every phase transition |
| Design System Patterns | Overwrite on user correction; mark *(user-corrected)* |
| Fix Inventory | Status column overwrites; other columns fixed once written |
| Approach Details | Overwrite per subsection on revision; mark *(user-revised)* |
| Execution Order | Overwrite when reordering; note reason |
| Deferred / Excluded · Execution Log | Append-only; never edit a completed entry |

---

## Project-Level Conventions

### Plans & Artifacts Folder
Place all plan documents and audit artifacts inside a dedicated folder at the project root that is gitignored. The recommended names are `.artifacts/` or `.scratch/` (add to `.gitignore`).

### Sub-Agent Usage
For broad exploration tasks (finding files, understanding file patterns, searching code), use a sub-agent with the minimum-cost model available to avoid context rot and preserve budget for the main task. For large repetitive refactors (e.g., renaming a function across 20+ files, updating the same pattern in many modules), delegate to a sub-agent with clear per-file instructions and a checkpoint after every batch. Verify each batch's output before starting the next.