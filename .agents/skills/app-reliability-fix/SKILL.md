---
name: app-reliability-fix
description: >
  Use after a reliability audit to implement fixes. Triggers: "implement the audit fixes",
  "fix the issues found", "apply the remediations", "start fixing", "fix the reliability issues".
  Reads findings from audit_progress.md, builds a plan, gets approval, then executes one fix at
  a time with a checkpoint after every change. Do NOT edit files before plan approval. Do NOT
  run a new audit — that is the reliability-audit skill's job.
depends_on: reliability-audit
---

# App Reliability Fix Skill

## Core Philosophy
Plan first, get approval, then execute one fix at a time. Each fix has dependencies, a blast radius, and regression risk. The user knows things the audit doesn't — an approach may clash with a library decision or a pattern may be intentional policy. Surface that before touching any file.

---

## Pre-Flight Check
Read `audit_progress.md`. If it does not exist or has no Audit Log entries, stop:
> "No audit findings found. Run the reliability-audit skill first, then return here."

---

## The Four Phases

| Phase | Name | Hard Stop? |
|---|---|---|
| 0 | Ingest & Understand | — |
| 1 | Build `fix_plan.md` | — |
| 2 | Present for Review | ⛔ No file touched until explicit approval |
| 3 | Execute → Checkpoint → Repeat | — |
| 4 | Finalize `walkthrough.md` | — |

---

## Phase 0 — Ingest & Understand

**0-A. Read audit findings.** From `audit_progress.md` extract for each finding: severity, category, file + line range, systemic flag, and any `**Updated:**` blocks. Copy the **Project Patterns** section verbatim — every fix must match it.

**0-B. Re-read every affected file.** Do not rely on audit snippets. Note: imports (may need to add one), function signature (must not change unless the fix explicitly says so), and existing tests (must not silently break).

**0-C. Map fix dependencies.** Common patterns:
- Shared infrastructure (DB singleton, error class) must land before anything that uses it
- Schema alignment before logic fixes
- Transactions before idempotency checks
- Systemic fixes applied as a group so no partial state exists

**0-D. Draft a concrete approach for every fix.** For each finding decide: exact lines that change, which project-pattern constructs to use (exact error class, logger call, transaction API), any new imports needed, and what could go wrong. These become the **Approach Details** in `fix_plan.md` and are the primary thing the user reviews.

---

## Phase 1 — Build `fix_plan.md`

```markdown
# Fix Implementation Plan

> - **Status:** Draft — Awaiting User Review
> - **Source audit:** `audit_progress.md`
> - **Last updated:** [what changed and why]

## Project Patterns (from audit)
- **Error handling:**
- **Logging:**
- **Naming conventions:**
- **Return conventions:**
- **Documentation style:**

## Fix Inventory

| ID | Audit Issue ID(s) | Severity | Title | File(s) | Category | Depends On | Status |
|---|---|---|---|---|---|---|---|
| FIX-001 | ISSUE-012 | 🚨 CRITICAL | Missing transaction on order creation | `orderService.ts:88` | Database | FIX-004 | Pending |

## Approach Details
_(One subsection per Fix Item. This is the section to review before approving.)_

### FIX-001 — [Title]
- **File:** `path/to/file.ts` lines X–Y
- **Approach:** Exactly what changes, which constructs are used, which lines are touched.
- **Error handling:** Exact error class, log fields, log level.
- **What will not change:** Public signature, unrelated logic.
- **Risk accounted for:** What could go wrong and how the approach handles it.

## Execution Order
_(Dependencies first, then severity, then blast radius. Non-obvious ordering explained.)_
1. FIX-004 — reason
2. FIX-002 — reason

## Deferred / Excluded
_(Empty until user review.)_

## Execution Log
_(Append-only.)_

## Verification Plan
- Run existing test suite for each changed file.
- Manually trigger the affected flow and confirm the previously silent error is now handled.
```

---

## Phase 2 — Present for Review (Hard Stop)

Present `fix_plan.md`. Your message must include:

1. **Headline summary** — finding counts by severity in plain English.
2. **Execution order rationale** — one sentence for the first two ordering decisions.
3. **Direct the user to Approach Details:**
   > "The **Approach Details** section describes exactly what each fix will do — which API, which error class, which log fields, which lines change. Please read each subsection before I write a single line of code. Wrong library, wrong error class, or a different architectural preference? This is the moment to catch it."
4. **Three gating questions:** Any fixes to skip entirely? Any to defer? Any approaches to change?
5. **Approval prompt:** *"Reply 'approved' to begin, or share feedback and I'll update the plan first."*

### Handling Feedback
Update the plan before executing anything. Apply exactly one operation per piece of feedback:

| User says | Operation |
|---|---|
| "Skip FIX-X, that's intentional" | Move to Deferred/Excluded with reason |
| "Defer FIX-X until after the release" | Move to Deferred/Excluded with reason |
| "Do FIX-X last" | Reorder Execution Order; note reason |
| "Use `pg.transaction()` not Prisma's `$transaction`" | Update Approach Details; mark *(user-revised)* |
| "The error class is `ServiceError` not `AppError`" | Update Project Patterns *(user-corrected)*; update every Approach Details referencing the old name |
| "Add a fix for X you missed" | Add to Fix Inventory + Approach Details + Execution Order |

Update status to `Revised — Awaiting Final Approval`. List what changed in Last updated. Re-present. Repeat until explicit approval. **Never interpret silence as approval.**

---

## Phase 3 — Execute, Checkpoint, Repeat

### 3-A. Announce Before Touching Files
```
Applying FIX-002 — [Title] (Issues: ISSUE-NNN)
File: path/to/file.ts lines X–Y
Approach (as approved): [one sentence summary of what changes]
(No other files touched in this step.)
```

### 3-B. Apply the Fix
Edit only the files listed for this Fix Item. The fix must:
- Match the approved Approach Details exactly
- Match Project Patterns (error class, logger, naming, docs)
- Not change the public interface unless the Fix Item explicitly says so
- Not add package dependencies without announcing them in 3-A

### 3-C. Update Artifacts
After every fix:

1. Append to `fix_plan.md` Execution Log:
```markdown
### ✅ FIX-NNN — [Title] (Issues: ISSUE-NNN)
- **Files changed:** `path/to/file.ts`
- **What was done:** [specific lines added/changed]
- **What was not changed:** [signature, unrelated logic]
- **Tests affected:** [pass/fail/gap noted]
- **Approach deviation:** None / [what changed and why]
```

2. Mark fix complete in `task.md`.
3. In `audit_progress.md`, prepend `✅ FIXED — ` to the finding's title.
   For deferred items, prepend `⏭️ DEFERRED — `, replace the Remediation section with a **Deferred Reason**, and add the Audit Legend if absent:
```markdown
## Audit Legend
- `✅ FIXED` — Resolved in the codebase.
- `⏭️ DEFERRED` — Acknowledged; out of scope for this run.
```

### 3-D. Checkpoint (after every single fix)
```
Checkpoint after FIX-002
✅ Done: FIX-002 — [Title]
⏳ Next: FIX-001 — [Title] ([file:lines])
         Planned approach: [one sentence from Approach Details]

fix_plan.md and task.md updated. Reply 'continue' to proceed, 'pause' to stop,
or share feedback to adjust the approach before the next fix.
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
Once all fixes complete, create `walkthrough.md` summarizing: all changes made, tests run, final codebase state, and follow-up gaps noticed during implementation.

### 3-G. Pause Summary
Prepend to `fix_plan.md`:
```markdown
<!-- ═══════════════════════════════════════════════════════════════════ -->
## 📋 Implementation Summary — Paused / Complete

**Fixes completed:** N of M planned

### Applied
| ID | Title | File(s) | Issue ID(s) | Deviation? |
|---|---|---|---|---|

### Remaining
| ID | Severity | Title | Issue ID(s) | Reason not applied |
|---|---|---|---|---|

### Deferred
| ID | Title | Issue ID(s) | Reason |
|---|---|---|---|

### Follow-up Gaps (noticed during implementation, not in original audit)
- `file.ts` — [what was noticed]

### To Resume
Open a new session, reference `fix_plan.md`, and say:
"Resume implementation from FIX-NNN — the plan is already approved."
<!-- ═══════════════════════════════════════════════════════════════════ -->
```

---

## Rules a Fix Must Never Break

| Rule | Why |
|---|---|
| One Fix Item per edit | Mixing fixes makes regressions unisloatable |
| No deviation from approved Approach Details without announcing it | Silent deviations break the review contract |
| No public signature changes unless the Fix Item says so | Signature changes break callers |
| No new package dependencies without announcing before the edit | New deps affect the whole project |
| No rewriting surrounding code not part of the fix | Unplanned changes bypass the safety model |
| No marking Done if the fix is partial | Mark ⚠️ Partially Applied and note what remains |
| Never skip the checkpoint | Trivial fixes have caused production incidents |
| Only prepend `✅ FIXED` or `⏭️ DEFERRED` to `audit_progress.md` | Altering audit data destroys the project record |
| Read the changed file back after editing | A fix with a syntax error is worse than no fix |

---

## `fix_plan.md` Mutation Rules

| Section | Rule |
|---|---|
| Status / Last updated | Overwrite on every phase transition |
| Project Patterns | Overwrite if user corrects; mark *(user-corrected)* |
| Fix Inventory | Status column overwrites; all other columns fixed once written |
| Approach Details | Overwrite per subsection on user revision; mark *(user-revised)* |
| Execution Order | Overwrite when reordering; note the reason |
| Deferred / Excluded | Append-only |
| Execution Log | Append-only; never edit a completed entry |