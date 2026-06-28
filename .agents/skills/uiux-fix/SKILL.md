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
Plan first, get approval, then execute one fix at a time. UI/UX changes have a blast radius across tokens, component variants, breakpoints, dark mode, and accessibility contracts. The user knows things the audit doesn't — a visual inconsistency may be intentional brand expression, a WCAG deviation may have an approved exception, a proposed component swap may conflict with a design-system migration in progress. Surface that before touching any file.

---

## Pre-Flight Check
Read `uiux_audit.md`. If it does not exist or has no Audit Log entries, stop:
> "No UI/UX audit findings found. Run the uiux-audit skill first, then return here."

---

## The Four Phases

| Phase | Name | Hard Stop? |
|---|---|---|
| 0 | Ingest & Understand | — |
| 1 | Build `uiux_fix_plan.md` | — |
| 2 | Present for Review | ⛔ No file touched until explicit approval |
| 3 | Execute → Checkpoint → Repeat | — |
| 4 | Finalize `walkthrough.md` | — |

---

## Phase 0 — Ingest & Understand

**0-A. Read audit findings.** From `uiux_audit.md` extract for each finding: severity, dimension/category, file(s) + component(s) affected, systemic flag, any `**Updated:**` blocks, and any WCAG criterion references (e.g. `1.4.3 AA`) — these are legally significant and must never be silently deferred. Copy the **Design System Patterns** section verbatim — every fix must match it.

**0-B. Re-read every affected file.** Do not rely on audit snippets. For each file note:
- Which design tokens, CSS custom properties, or theme variables it already imports (use these — never raw values)
- Which component variants exist (the fix must not silently break a variant not tested during the audit)
- Which ARIA attributes or semantic HTML elements are present (altering these is a separate risk surface from visual changes)
- Whether a Storybook story or snapshot test exists (the fix must not cause an unintended visual regression)
- Whether the component is shared across multiple pages (blast radius is wider than it appears)

**0-C. Map fix dependencies.** Common patterns:
- Token/variable definitions before any component that uses them
- Shared component fixes before page-level overrides of those components
- Base typography/spacing scale before individual heading or layout fixes
- Responsive breakpoint values before layout rules that reference them
- WCAG/accessibility fixes before cosmetic fixes — never regress accessibility during an aesthetic pass
- Systemic findings fixed as a group so no partial state exists

**0-D. Draft a concrete approach for every fix.** For each finding decide: exact lines/selectors/props/attributes that change, which design-system constructs to use (exact token name, component variant, ARIA pattern, breakpoint variable), any new token or import needed, the WCAG criterion satisfied if applicable, and what could go wrong. These become the **Approach Details** in `uiux_fix_plan.md` and are the primary thing the user reviews.

---

## Phase 1 — Build `uiux_fix_plan.md`

```markdown
# UI/UX Fix Implementation Plan

> - **Status:** Draft — Awaiting User Review
> - **Source audit:** `uiux_audit.md`
> - **Last updated:** [what changed and why]

## Design System Patterns (from audit)
- **Design system / component library:**
- **Colour token convention:**
- **Spacing scale:**
- **Typography scale:**
- **Breakpoint convention:**
- **Icon library:**
- **Dark mode / theming approach:**
- **WCAG conformance target:**

## Fix Inventory

| ID | Audit Issue ID(s) | Severity | Title | File(s) / Component(s) | Category | Depends On | Status |
|---|---|---|---|---|---|---|---|
| FIX-001 | ISSUE-001 | 🚨 CRITICAL | Focus indicator missing on interactive elements | `Button.tsx`, `Input.tsx` | Accessibility | — | Pending |

## Approach Details
_(One subsection per Fix Item. This is the section to review before approving.)_

### FIX-001 — [Title]
- **File(s):** `path/to/component.tsx`
- **WCAG criterion:** [e.g. 2.4.7 Focus Visible (AA)] / N/A
- **Approach:** Exactly what changes, which token/ARIA pattern/HTML element/CSS rule is used.
- **What will not change:** Visual appearance of unrelated elements, component props, validation logic.
- **Risk accounted for:** What could go wrong (dark mode conflict, specificity clash, form library override) and how the approach handles it.

## Execution Order
_(Token/system fixes first, then WCAG violations by severity, then cosmetic. Non-obvious ordering explained.)_
1. FIX-NNN — reason

## Deferred / Excluded
_(Empty until user review.)_

## Execution Log
_(Append-only.)_

## Verification Plan
- Visual inspection at all relevant breakpoints after each fix.
- Screen reader / keyboard navigation test for every accessibility fix.
- Confirm design tokens resolve correctly in light and dark mode.
- Run snapshot tests where applicable and confirm diffs are intentional.
```

---

## Phase 2 — Present for Review (Hard Stop)

Present `uiux_fix_plan.md`. Your message must include:

1. **Headline summary** — finding counts by severity in plain English, plus how many carry a WCAG criterion.
2. **Execution order rationale** — one sentence for the first two ordering decisions, especially why token-level fixes land before component-level fixes.
3. **Direct the user to Approach Details:**
   > "The **Approach Details** section describes exactly what each fix will do — which token, which ARIA pattern, which HTML element, which CSS rule, which lines change. Please read each subsection before I write a single line of code. Wrong token name, a different ARIA pattern your team prefers, or a WCAG exception already approved for this element? This is the moment to catch it."
4. **Three gating questions:** Any fixes to skip entirely? Any to defer? Any approaches to change?
5. **Approval prompt:** *"Reply 'approved' to begin, or share feedback and I'll update the plan first."*

### Handling Feedback
Update the plan before executing. Apply exactly one operation per piece of feedback:

| User says | Operation |
|---|---|
| "Skip FIX-X, that's intentional" | Move to Deferred/Excluded with reason |
| "Defer FIX-X until after the design-system migration" | Move to Deferred/Excluded with reason |
| "Do FIX-X before FIX-Y" | Reorder Execution Order; note reason |
| "Use `box-shadow` instead of `outline` — our reset nukes outlines" | Update Approach Details; mark *(user-revised)* |
| "The token is `--focus-ring` not `--color-focus-ring`" | Update Design System Patterns *(user-corrected)*; update every Approach Details referencing the old name |
| "FIX-X also needs to work on our brand-yellow background" | Update Approach Details with the additional contrast check; mark *(user-revised)* |
| "Add a fix for X you missed" | Add to Fix Inventory + Approach Details + Execution Order |

Update status to `Revised — Awaiting Final Approval`. List what changed in Last updated. Re-present. Repeat until explicit approval. **Never interpret silence as approval.**

---

## Phase 3 — Execute, Checkpoint, Repeat

### 3-A. Announce Before Touching Files
```
Applying FIX-003 — [Title] (Issues: ISSUE-NNN)
Files: path/to/file.tsx
WCAG: [criterion] / N/A
Approach (as approved): [one sentence summary of what changes]
(No other files touched in this step.)
```

### 3-B. Apply the Fix
Edit only the files listed for this Fix Item. The fix must:
- Match the approved Approach Details exactly
- Use only tokens, variables, component variants, ARIA patterns, and naming conventions from Design System Patterns — never raw hex, pixel, or spacing values when a token exists
- Not change the visual appearance of elements not named in the Fix Item
- Not alter existing ARIA attributes or semantic elements beyond what the Fix Item specifies
- Not add package dependencies without announcing in 3-A

After editing, read the changed file back and verify: no syntax error, the referenced token/ARIA attribute/HTML element actually exists in the project, no unintended adjacent lines changed.

### 3-C. Update Artifacts
After every fix:

1. Append to `uiux_fix_plan.md` Execution Log:
```markdown
### ✅ FIX-NNN — [Title] (Issues: ISSUE-NNN)
- **Files changed:** `path/to/file.tsx`
- **What was done:** [specific elements, tokens, attributes added/changed]
- **WCAG criteria satisfied:** [criterion] / N/A
- **What was not changed:** [visual appearance, props, unrelated logic]
- **Tests affected:** [snapshot updated / all pass / gap noted]
- **Approach deviation:** None / [what changed and why]
```

2. Mark fix complete in `task.md`.
3. In `uiux_audit.md`, prepend `✅ FIXED — ` to the finding's title.
   For deferred items, prepend `⏭️ DEFERRED — `, replace the Recommendation section with a **Deferred Reason**, and add the Audit Legend if absent:
```markdown
## Audit Legend
- `✅ FIXED` — Resolved in the codebase.
- `⏭️ DEFERRED` — Acknowledged; out of scope for this run.
```

### 3-D. Checkpoint (after every single fix)
```
Checkpoint after FIX-003
✅ Done: FIX-003 — [Title] ([files]) (Issues: ISSUE-NNN)
⏳ Next: FIX-004 — [Title] ([file:component])
         Planned approach: [one sentence from Approach Details]
         WCAG: [criterion] / N/A

uiux_fix_plan.md and task.md updated. Reply 'continue' to proceed, 'pause' to
stop, or share feedback to adjust the approach before the next fix.
```
Stop. Do not proceed until the user responds.

### 3-E. Checkpoint Responses

| User says | Action |
|---|---|
| "continue" / "yes" | Apply next fix; return to 3-A |
| "pause" / "stop" | Write Pause Summary (3-G); stop |
| "skip this one" | Move to Deferred/Excluded; announce new next item; wait |
| "change the approach to X" | Update Approach Details; re-announce via 3-A; wait |
| "add this other fix first" | Add to Fix Inventory + Approach Details + Execution Order; announce; wait |

### 3-F. Finalize
Once all fixes complete, create `walkthrough.md` summarizing: all changes made, WCAG criteria resolved, visual/accessibility tests run, any follow-up gaps noticed, and final codebase state.

### 3-G. Pause Summary
Prepend to `uiux_fix_plan.md`:
```markdown
<!-- ═══════════════════════════════════════════════════════════════════ -->
## 📋 UI/UX Implementation Summary — Paused / Complete

**Fixes completed:** N of M planned | **WCAG violations resolved:** N of M

### Applied
| ID | Title | File(s) | WCAG Criteria | Issue ID(s) | Deviation? |
|---|---|---|---|---|---|

### Remaining
| ID | Severity | Title | Issue ID(s) | Reason not applied |
|---|---|---|---|---|

### Deferred
| ID | Title | Issue ID(s) | Reason |
|---|---|---|---|

### Follow-up Gaps (noticed during implementation, not in original audit)
- `file.tsx` — [what was noticed and which WCAG criterion it may relate to]

### To Resume
Open a new session, reference `uiux_fix_plan.md`, and say:
"Resume UI/UX implementation from FIX-NNN — the plan is already approved."
<!-- ═══════════════════════════════════════════════════════════════════ -->
```

---

## Rules a Fix Must Never Break

| Rule | Why |
|---|---|
| One Fix Item per edit | Mixing fixes makes visual regressions and accessibility failures untraceable |
| No deviation from approved Approach Details without announcing it | Silent deviations break the review contract |
| No raw hex, pixel, or spacing values when a token exists | Hard-coded values break on theme switch, dark mode, or the next design-system update |
| No ARIA attribute or semantic element altered beyond what the Fix Item specifies | Accessibility attributes have a wider blast radius than they appear |
| No visual changes to elements not named in the Fix Item | Unplanned style tweaks bypass the safety model |
| No new package dependencies without announcing before the edit | New deps affect the whole project |
| No marking Done if the fix is partial | Mark ⚠️ Partially Applied and note what remains |
| Never skip the checkpoint | Trivial-looking style fixes have caused production regressions |
| Every accessibility fix must record the WCAG criterion it satisfies | Removes traceability needed for compliance reporting |
| Only prepend `✅ FIXED` or `⏭️ DEFERRED` to `uiux_audit.md` | Altering audit data destroys the project record |
| Read the changed file back after every edit | Verify no syntax error, no unintended adjacent line changed, referenced token exists |
| Never fix a WCAG violation and then regress it with a later cosmetic fix | Accessibility state must monotonically improve across the run — check that cosmetic fixes do not override focus styles, contrast values, or semantic elements restored earlier |

---

## `uiux_fix_plan.md` Mutation Rules

| Section | Rule |
|---|---|
| Status / Last updated | Overwrite on every phase transition |
| Design System Patterns | Overwrite if user corrects; mark *(user-corrected)* |
| Fix Inventory | Status column overwrites; all other columns fixed once written |
| Approach Details | Overwrite per subsection on user revision; mark *(user-revised)* |
| Execution Order | Overwrite when reordering; note the reason |
| Deferred / Excluded | Append-only |
| Execution Log | Append-only; never edit a completed entry |