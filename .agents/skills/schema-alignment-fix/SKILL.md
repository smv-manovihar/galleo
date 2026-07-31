---
name: schema-alignment-fix
description: >
  Use when asked to remediate schema alignment findings across DB → server → wire → client.
  Triggers: "fix the schema mismatches", "apply the alignment fixes", "remove the dead fields",
  "slim down the payload", "make the DB the source of truth", "start fixing the contract issues".
  Reads findings from `schema_audit.md`, builds `schema_fix_plan.md`, gets approval, then executes
  one fix at a time with a checkpoint after every change. Do NOT edit any file before plan
  approval. Do NOT run a new audit — that is the schema-alignment-audit skill's job.
depends_on: schema-alignment-audit
---

# Backend ↔ Frontend Schema Alignment Fix

## Core Philosophy
Plan first, get approval, then one fix at a time. Schema fixes are **deploy-ordered**: a change that's correct in the repo can still break production if server and client ship in the wrong order, or if a consumer you can't see is still reading the field you deleted. Every fix therefore carries a hop order, a deploy order, and a rollback note before it is applied.

Fix the **truth chain before the symptoms**. Aligning twelve hand-copied types by hand produces twelve fixes and no durable outcome; generating them from one source fixes the class. If a TRUTH finding is in scope, it goes first and collapses its dependents.

Runs **one fix at a time** with a **checkpoint after every change**. Supports **checkpoint mode** (pauses after each fix, waits for `continue`) and **continuous mode** (auto-proceeds without pausing). Reply `continuous` at any checkpoint to switch modes. No batch mode. State lives in `schema_fix_plan.md`, so a fresh session resumes from the plan alone — without losing the approval gate or re-applying a done fix.

## Output Economy
Plan and chat use dense fragments, not prose.
- Plan rows: one line per field of the fix record. No restated findings, no code in the plan.
- Execution Log: bullets, ≤4 per fix. What changed, what verified, what surprised you.
- Chat at a checkpoint: 3 lines — done + verification result / next + approach / prompt. Never paste the plan back.
- No diffs in chat unless asked. Cite `path:line`.

---

## Artifacts
- **`schema_fix_plan.md`** — single source of truth: Conventions, Fix Inventory (per-fix status), Fix Records, Execution Order, append-only Execution Log.
- **`schema_audit.md`** — read-only input; annotated only with `✅ FIXED` / `⏭️ DEFERRED` / `🚫 WONTFIX` prefixes on findings.
- **`contract_map.md`** — read-only; the field tables are the acceptance target.
- **`walkthrough.md`** — final summary, created once the queue is done.

> No separate tracker. Per-fix state = the Inventory **Status** column; next fix = first `pending` in Execution Order.

---

## Pre-Flight
1. **Resume?** `schema_fix_plan.md` exists → go to **Resuming**, not Phase 0.
2. **Fresh?** Read `schema_audit.md`. Missing or no findings → stop:
   > "No audit findings found. Run schema-alignment-audit first, then return here."

**Resuming:** read the plan. If any fix is `pending` and the plan was never approved (no `APPROVED` marker in the Log), you are still behind the Phase 2 gate — present, don't execute. Otherwise continue from the first `pending`.

---

## Phases

| Phase | Name | Hard stop? |
|---|---|---|
| 0 | Ingest & verify | — |
| 1 | Build `schema_fix_plan.md` | — |
| 2 | Present for review | ⛔ no file touched until explicit approval |
| 3 | Execute → verify → checkpoint → repeat | ⛔ stops after every fix (continuous mode skips the wait) |
| 4 | Finalize `walkthrough.md` | — |

---

## Phase 0 — Ingest & verify

**0-A.** Per finding extract: id, category, severity, hops touched, `symptom-of`, confidence, blast. Copy **Conventions** and **Truth Chain** from `contract_map.md` verbatim — every fix conforms to them, or changes them deliberately as its own fix.

**0-B. Targeted reads only** — the cited lines plus the mapper/generator that owns them. Not whole files, not whole directories.

**0-C. Re-verify before planning.** Any finding marked `unverified` or `confidence: low` must be confirmed or dropped now. For a `DEAD` finding, that means actually searching every consumer surface again. Report drops in one line each; don't plan work on a finding you couldn't confirm.

---

## Phase 1 — Build the plan

**1-A. Group.** Collapse findings that one change resolves (usually a TRUTH fix absorbing its dependents). One fix record per change, listing the ids it closes.

**1-B. Fix record** — fixed fields, one line each:

```
### F3 — closes SA-07, SA-11 · HIGH · status: pending
- Change: serialize money as decimal string; parse to Decimal type client-side
- Hops: wire (schemas/order.py:41) → client type (types/order.ts:12) → 4 read sites
- Order: server first — client tolerates string+number for one release
- Compat: additive read tolerance, no wire break
- Stays: DB column, ORM type, existing rows untouched
- Risk: any unaudited consumer parsing `total` as number · sort/compare sites
- Verify: round-trip a 12,2 value; typecheck both sides; contract test on POST+GET
- Rollback: revert serializer; client already accepts both
```

**1-C. The four fix strategies.** Pick one per fix and name it in `Compat`:

| Strategy | Use when | Shape |
|---|---|---|
| **Direct** | shape is internal, or both ends deploy atomically | change both hops, one commit |
| **Expand-migrate-contract** | wire-visible with live consumers | add new field → dual-populate → move readers → verify zero reads → remove old |
| **Generate** | TRUTH finding, hand-maintained hop | author once, generate the hop, delete the hand-written copy, add the CI drift gate |
| **Tolerate-then-tighten** | client can't ship in step with server | client accepts both shapes first, server changes, client tightens after |

**1-D. Ordering rules.** Execution Order obeys all of:
1. TRUTH/generation fixes before the symptoms they collapse.
2. Within a fix, hops in truth order: source (DB/schema) → server → wire → client. **Never client-first** — that hides the mismatch instead of fixing it.
3. Data-loss fixes before payload trimming. Stop the bleeding before tidying.
4. Additive before subtractive. Every removal lands after its replacement is proven in use.
5. Field removals last, and only where Evidence Rule 2 was satisfied. External consumer → deprecate with an owner and a date, don't delete.
6. Widening a type or loosening a validator to silence an error is **not** a fix. If a stricter type is correct, fix the producer.
7. **An `ORIGIN-discarded` field has two opposite fixes** — give it a column, or remove it from the client. Which one is right depends on whether the feature was supposed to work, and that is not yours to decide. Ask, in one line, before planning it. Same for a derived field the client can edit: lock the input, or make it real. Never resolve either by quietly deleting the UI.
8. Adding a durable home comes before anything that reads it, and the constraint ships with the column — a nullable unconstrained column added "to fix it later" just relocates the finding.

**1-E. Inventory + defer list.** Table of `id | closes | severity | strategy | status`. Anything you recommend not doing: one line and a reason (deliberate policy, external dependency, cost > benefit).

---

## Phase 2 — Present (⛔ gate)

≤15 lines in chat:
```
N fixes closing M findings. Order: F1 (generate wire types, collapses 6) → F2 (money precision) → …
Wire-visible: F2, F5 — expand-migrate-contract, server ships first.
Migrations: F7 adds a nullable column, no backfill.
Deferring: SA-19 (partner integration owns the field).
Need from you: (1) is `legacy_ref` deliberate? (2) can server and client deploy independently?
Approve to start with F1?
```
Then stop. Do not touch a file. Record `APPROVED <scope>` in the Log when granted; approval covers the listed fixes only.

---

## Phase 3 — Execute one fix (repeat)

**3-A. Announce** — exactly 4 lines: fix id + change / hops in order / verification / deploy note.

**3-B. Apply**, source hop outward. Rules:
- Edit the generator input, never a generated file. If a generated file was hand-edited before, restore generation and note the loss.
- One fix per commit-sized change. No opportunistic refactors, no drive-by renames.
- Match the recorded Conventions. If a fix needs to change a convention, that's a separate fix.
- Migrations: additive and reversible, or say plainly that it isn't and get a second yes. Never destructive in the same step as the code that stops using the column.
- Removing a field: delete readers first, then the producer, then the column — separate fixes if any step is wire-visible.
- Update fixtures, seeds, and contract tests in the same fix. A fix that leaves fixtures stale isn't done.

**3-C. Verify** — run what the record said, no more. Typecheck both sides, contract/schema test, and one real round-trip for anything touching values. Report the actual result, including "not run, here's why". A fix with no verification is `applied`, not `done`.

**3-D. Checkpoint.** Update Status, append ≤4 Log bullets, annotate the closed findings in `schema_audit.md`. Then 3 lines:
```
F3 done — decimal string round-trips clean, both sides typecheck, 4 read sites updated.
Next: F4 — drop `legacy_ref` producer (readers removed in F2). Additive-safe, no migration.
Continue?
```
In **checkpoint mode**: stop. If verification failed: report in 2 lines, propose either a narrower fix or a revert, and wait. Don't chain a second attempt unprompted. In **continuous mode**: auto-proceed to next fix (loop back to Phase 3).

---

## Phase 4 — Finalize

`walkthrough.md`, ≤20 lines:
```
## Fixed
F1 <one clause> — closes SA-02,03,05,08,12,14
## Truth chain now
<before → after, plus the CI gate added>
## Deploy order
1. server (F2, F5)  2. client (F2 tighten, F4)  3. migration F7 (safe any time)
## Deferred / wontfix
SA-19 — partner owns the field
## Still open
<contracts never audited, fields still hand-maintained>
```
Then one line in chat pointing at the file. No victory lap.

---

## Project-Level Conventions

### Plans & Artifacts Folder
Place all plan documents and audit artifacts inside a dedicated folder at the project root that is gitignored. The recommended names are `.artifacts/` or `.scratch/` (add to `.gitignore`).

### Sub-Agent Usage
For broad exploration tasks (finding files, understanding file patterns, searching code), use a sub-agent with the minimum-cost model available to avoid context rot and preserve budget for the main task. For large repetitive refactors (e.g., renaming a function across 20+ files, updating the same pattern in many modules), delegate to a sub-agent with clear per-file instructions and a checkpoint after every batch. Verify each batch's output before starting the next.