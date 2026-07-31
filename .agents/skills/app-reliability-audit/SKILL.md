---
name: app-reliability-audit
description: >
  Use when asked to audit a codebase for reliability, resilience, or production-readiness issues.
  Triggers: "audit my codebase", "find reliability issues", "review for production", "check for
  race conditions / timeouts / N+1 queries", "SRE review", "find vulnerabilities", "trace user
  flows". Outputs three artifacts: `audit_backlog.md`, `audit_traces.md`, and `audit_progress.md`. NEVER executes code
  changes. Do NOT use for security pen-testing, CVE scanning, or static type-checking.
---

# App Reliability & Resilience Audit Skill

## Core Philosophy
Trace real user flows end-to-end. Production failures are cascades of small gaps — a missing timeout, a swallowed exception, a schema mismatch — not single catastrophic bugs. Avoid alarm fatigue (flagging every TODO as HIGH) and false confidence (stopping at the controller layer).

The audit runs **one flow at a time** and **checkpoints after each flow**. No fixed flow/file cap — it proceeds until the flow queue is exhausted or you pause. State lives entirely in the two artifact files, so a fresh session continues from where the last left off.

The audit supports two modes: **checkpoint mode** (pauses after each flow, waits for `continue`) and **continuous mode** (auto-proceeds without pausing). Reply `continuous` at any checkpoint to switch, or `checkpoint` to switch back.

## Output Economy
Write for a reader who scans. Both artifact files and chat updates use dense fragments, not prose.
- Findings: state trigger → failure → fix in the fewest unambiguous words; no lead-in sentences.
- Code in a finding: only the lines that show the flaw (≤10), never a whole function.
- Log/trace rows: one line per event; never restate context already on the page.
- Chat at a checkpoint: 2–3 lines — done / next / how to continue. Don't paste the artifact back.
- Fill a template field or omit it; don't write "N/A because…".

---

## What Counts as a Flow
A flow **must** start at an entry point (route/UI event/CLI), pass through service/logic layers, and **end at a storage or external service boundary**. Tracing half a flow is an audit failure.

---

## Phase 0 — Learn the Project First (Mandatory)

### 0-A. Build the Structural Map
Answer by reading landmark files only:
1. **Project type?** — `package.json`, `pyproject.toml`, etc. Note frameworks, ORMs, HTTP clients, AI SDKs.
2. **Service boundaries?** — `docker-compose.yml`, `.env.example`, `config/`. List every external service.
3. **Entry points?** — routing files first (`routes`, `router`, `app`, `server`, `main`).
4. **Data models?** — `*.prisma`, `models.py`, `*.schema.ts`, `types.ts`. Ground truth.
5. **File count?** — `git ls-files --cached --others --exclude-standard | wc -l` or `(git ls-files --cached --others --exclude-standard).Count`. (IMPORTANT: scope the listing to required folders only)

Write into **Project Profile**.

### 0-B. Learn the Documentation Pattern
Read 2–3 well-documented files to capture: comment style, error message format, naming conventions, logging pattern (structured vs. plain), return conventions (tuples / exceptions / Result types), test coverage. Record in **Project Patterns**. All remediations mirror these exactly.

### 0-C. Calibrate the Quality Baseline
Silently read one complete flow without flagging. Determine: is error handling absent or just inconsistent? TODOs on critical paths? Is defensive coding the norm? A systemic pattern outranks an isolated one on severity.

### 0-D. Build the Flow Backlog
Read the routing layer and all entry points (route files, server entry, scheduled jobs, webhook receivers, queue consumers, CLI commands, event listeners). List every distinct flow in a **Flow Backlog** showing the actual call path:

```
FLOW-001 Create resource     → `POST /api/resources` → `service.create` → `store.save` → DB write
FLOW-002 Get resource        → `GET /api/resources/:id` → `service.getById` → `store.findOne` → DB read
```

Order: highest-risk/traffic first. The backlog is the **source of truth** for all known flows. During Phase 2, flows discovered mid-audit (following a call chain reveals an undocumented path) are **appended** to the backlog.

---

## Phase 1 — Initialize `audit_backlog.md`

Create in project root before scanning any source file. The flow queue.

```markdown
# Audit Backlog

| Flow ID | Status | Flow Path |
|---------|--------|-----------|
| FLOW-001 | ⏳ Pending | `entry` → `service` → `store` → boundary |

Status: ⏳ Pending / 🔍 Current / ✅ Done / ⛔ Dead-end
New flows discovered mid-audit → appended as ⏳ Pending.
```

**Mutation Rules:**
| Section | Rule |
|---|---|
| Flow status | Move from ⏳ → 🔍 → ✅ (or ⛔). Never delete entries. |
| Discovered flows | Append as ⏳ Pending. |

---

## Phase 1.5 — Initialize `audit_traces.md`

```markdown
# Reliability Audit — Flow Traces
### 🔍 Trace — FLOW-001: [desc]
| # | File | Function | Action |
|---|---|---|---|
| 1 | `router.py` | `POST /resource` | input validation |
| 2 | `service.py` | `create_resource` | business logic |
| 3 | `store.py` | `save_to_db` | atomic write + error bubbling |

**Simulated:** [1–2 lines: the user flow and the reliability concern tested.]
```

---

## Phase 1.75 — Initialize `audit_progress.md`

```markdown
<!-- FINAL SUMMARY prepended here on completion -->

# Reliability Audit — Progress

## Status
| Field | Value |
|---|---|
| Phase | Phase 0 / Auditing `FLOW-NNN` / ⏸️ Checkpoint / ✅ Queue exhausted |
| Flows done | X / Y |
| Findings | N (🔴 HIGH N · 🟠 MEDIUM N · 🟡 LOW N) |
| Last checkpoint | after `FLOW-NNN` |

## Project Profile
- Language/runtime · Framework · ORM/DB client · External services · Total files · Key risk areas

## Project Patterns
- Error handling · Logging · Naming · Return conventions · Test coverage

## Findings Log
_(Append-only. Findings reference Flow IDs linked from audit_traces.)_
```

### Mutation Rules
| Section | Rule |
|---|---|
| Status | Overwrite on every file read |
| Project Profile / Patterns | Fill once; overwrite with `*(revised)*` if corrected |
| Findings Log | Append only. Add `**Updated:**` line if severity escalated or blast radius changed. |

---

## Phase 2 — Execution Loop

One flow at a time; checkpoint after each. Repeat until the queue is empty or the user pauses.

**2-A. Select next flow** — pick first `⏳ Pending` from `audit_backlog.md`. Mark it `🔍 Current`.

**2-B. Walk the flow** — follow the real call chain from entry to terminal boundary. At each step, append a row to `audit_traces.md` (file | function | action).

**2-C. Write findings** — when a flaw is found, write it to `audit_progress.md` Findings Log using the Finding Template. Link the finding ID in `audit_traces.md` Action column. If a new flow is discovered mid-audit, append it to `audit_backlog.md` as `⏳ Pending`.

**2-D. Checkpoint** — no fixed budget; checkpoint at natural boundaries so the run is pausable/resumable. Triggers:
```
flow reaches terminal boundary   → CHECKPOINT (flow done)
3 consecutive dead ends          → CHECKPOINT (mark ⛔ Dead-end)
user pause / context long        → CHECKPOINT
flow queue empty                 → CHECKPOINT + Final Summary
```
At every checkpoint: flush both files; mark flow `✅ Done` (or `⛔ Dead-end`) in backlog; set next `⏳ → 🔍`; set Status `⏸️ Checkpoint`; emit checkpoint line. In **checkpoint mode**: stop and wait for user. In **continuous mode**: auto-proceed to next flow (loop back to 2-A).

**Checkpoint line:**
> **Checkpoint — `FLOW-NNN` done.** [N] findings · [Y]/[X] flows. Top: [one line]. Next: `FLOW-NNN`. Reply **continue**, or `continuous` to auto-proceed, or resume from `audit_backlog.md`.

---

## Reasoning Before Flagging

Before writing any finding, run this chain — it separates a real flaw from a style preference or missing feature.

1. **Intended behavior?** A missing null check is only a flaw if `null` can actually arrive here.
2. **What input breaks it?** Name it concretely ("empty array", "concurrent second request", "504 from the AI API"). Can't name it → not a finding yet; keep reading.
3. **What happens on break?** Throws and propagates cleanly? Swallows and returns corrupt data? Partial write → inconsistent state? The failure mode sets severity, not the pattern.
4. **Right layer to fix?** A missing check in B may be a design gap in A. Flag where the fix is most durable.
5. **Already handled elsewhere?** Middleware, base class, wrapper, DB constraint. Confirm the guard exists before skipping — flagging a guarded issue is noise.
6. **Flaw or choice?** Unbounded query on a ≤50-row table, no timeout on a loopback call, optimistic update with client rollback — if intentional (comment/config/test), downgrade or skip and note the assumption.

Only after all six should you write a finding.

---

## The Nine Audit Categories

### 1 — Schema & Model Alignment
- **Frontend → API**: field names, casing, required vs. optional
- **Pydantic / TS optionality**: logically required fields (`project_id`, `user_id`) must not be `Optional`
- **API → Service**: destructured fields match the service signature
- **Service → DB**: ORM model matches column names, types, nullability
- **AI response → DB**: validated against schema before persistence
- **API response → Frontend**: DTO field names/types match what the frontend consumes

### 2 — Exception & Error Handling
Every error must bubble, be logged with context, or be explicitly handled. Flag: empty catch / `.catch(() => {})` (CRITICAL on write/payment/auth); unawaited promise-returning calls; errors with no operation/entity/input context; caller getting success after an error was caught and not re-thrown.

### 3 — Timeout & Back-Pressure
Every cross-process call needs an explicit timeout (HTTP, DB on large sets, queue polls, remote file I/O). Also: retries without exponential backoff + jitter; no circuit breaker on high-traffic AI/payment deps; unbounded loops over DB records with no chunking/pagination.

### 4 — Database Safety
- **N+1**: per-iteration DB call where a bulk query serves the same purpose
- **Missing transactions**: 2+ writes that must succeed/fail together, unwrapped
- **Connection per request**: DB client built inside a per-request handler
- **Missing indexes**: filter/sort fields on large tables absent from the schema

### 5 — Concurrency & Race Conditions
Check-then-act without atomicity (fix: `upsert` + unique constraint); missing idempotency keys on payment/order/subscription endpoints; shared mutable state without sync in a multi-process/thread context; optimistic concurrency without version/timestamp check before write.

### 6 — Rate Limiting & Back-Pressure
Public write/expensive endpoints without rate limiting; background jobs without a concurrency cap; outbound calls to rate-limited upstreams without a 429 handler / token bucket; webhook receivers without signature verification.

### 7 — Performance & Efficiency
Flag only where it degrades under *realistic* load.
- **Redundant computation**: same value derived >once per request with no memoization
- **Over-fetching**: `SELECT *` / full relation when 1–2 fields are used (large relation or hot path only)
- **Sequential I/O**: `await a(); await b();` where `a`,`b` are independent and parallelizable
- **Hot-path re-init**: config parse, regex compile, schema object, SDK client built per request (belongs at module load)
- **Unbounded memory**: append to an in-memory structure with no cap/flush (streams, background jobs)
- **Blocking I/O on async thread**: sync file reads, `JSON.parse` of huge payloads, CPU-heavy transforms on the event loop

### 8 — Code Duplication & Abstraction Flaws
Flag only when duplication creates real divergence risk.
- **Diverged duplicates**: same logic in 2+ places, one updated and the other not (the only immediate reliability risk)
- **Inline reimplementation** of an existing utility (cite its location)
- **Copy-pasted validation** without a shared schema — one will drift
- **Parallel type hierarchies** (DB model / DTO / API type) kept in sync by hand, no mapper
- **Repeated try/catch boilerplate** where a wrapper/middleware would centralize

### 9 — Logic Flaws & Behavioral Correctness
Hardest to find, most damaging — they look like working code.
- **Boundary conditions**: off-by-one pagination, wrong operator (`>` vs `>=`), date fence-posts — trace the math
- **Assumption violations**: assumes sorted list / non-empty / UTC / lowercase without upstream guarantee — read producer + consumer together
- **Silent default substitution**: `|| 0`, `?? ''`, `or []` masking an unexpected missing value with no log
- **State-machine violations**: any caller can write any state; no transition guard or DB constraint
- **Wrong aggregation scope**: missing `WHERE`, row-multiplying join, or filter applied after aggregation
- **Auth after fetch**: ownership filtered in app code after the query — predicate must be *in* the query
- **Asymmetric create/delete**: create writes N stores, delete cleans up fewer — trace both

---

## Severity Rubric

| Severity | Condition |
|---|---|
| **CRITICAL** | Data loss, silent corruption, full outage, or auth boundary crossed. Wrong outcome every time, regardless of load. |
| **HIGH** | Significant user-facing failure / data inconsistency under realistic load or normal retries. Needs a deploy or manual DB fix to recover. |
| **MEDIUM** | Degrades gracefully but causes visible errors, measurable perf regression, or latent divergence that will surface later. |
| **LOW** | Code-quality / abstraction / optimization gap, no current user impact. |

**Systemic upgrade**: same flaw in 3+ files → escalate one level; state reason + files.
**Don't escalate** a zero-impact LOW just for frequency. Frequency amplifies impact-based severity, not zero-impact severity.

---

## Finding Template

```markdown
### [CRITICAL|HIGH|MEDIUM|LOW] — <specific title>

| | |
|---|---|
| Issue | `ISSUE-NNN` |
| Flow | `FLOW-NNN` |
| File | `path` lines X–Y |
| Category | Schema / Exception / Timeout / DB / Race / RateLimit / Perf / Duplication / Logic |
| Systemic | Yes (`fileA`,`fileB`) / No |

**Flaw** — trigger input + what breaks. Code ≤10 lines.
**Impact** — what fails, for whom, how visibly, auto-recover or manual.
**Fix** — before/after using the project's own error class, logger, naming. Note any migration/schema/config change.
```

---

## Flow Trace Template

```markdown
### 🔍 Trace — FLOW-NNN: [desc]
| # | File | Function | Action |
|---|---|---|---|
| 1 | `router.py` | `POST /resource` | input validation |
| 2 | `service.py` | `create_resource` | business logic |
| 3 | `store.py` | `save_to_db` | atomic write + error bubbling |

**Simulated:** [1–2 lines: the user flow and the reliability concern tested.]
```

---

## Final Summary Block

Prepend to top of `audit_progress.md` when the queue is exhausted or the user ends at a checkpoint.

```markdown
<!-- ════════════════════════════════════════════════════════ -->
## ⛔ FINAL SUMMARY

Checkpoint reason: Queue exhausted / User ended
Flows done: Y / X

### Health: 🔴 Critical / 🟠 High Risk / 🟡 Moderate / 🟢 Healthy
_(one paragraph: worst finding, most pervasive pattern, highest-density layer, isolated vs. systemic)_

### Counts
🚨 CRITICAL N · 🔴 HIGH N · 🟠 MEDIUM N · 🟡 LOW N · **Total N**

### Top 3 Fixes
1. `[file:lines]` — issue → fix
2. `[file:lines]` — issue → fix
3. `[file:lines]` — issue → fix
<!-- ════════════════════════════════════════════════════════ -->
```

Then send:
> **Audit complete — queue exhausted.** [N] findings · [Y]/[X] flows. Most urgent: [one line]. Unaudited flows in `audit_backlog.md`.

---

## Resuming
State lives in the artifact files. A fresh session reads `audit_backlog.md` + `audit_traces.md` + `audit_progress.md`, re-reads Project Profile & Patterns, resumes at the `🔍 Current` flow in the backlog, and skips completed flows.

---

## Project-Level Conventions

### Plans & Artifacts Folder
Place all plan documents and audit artifacts inside a dedicated folder at the project root that is gitignored. The recommended names are `.artifacts/` or `.scratch/` (add to `.gitignore`).

### Sub-Agent Usage
For broad exploration tasks (finding files, understanding file patterns, searching code), use a sub-agent with the minimum-cost model available to avoid context rot and preserve budget for the main task. For large repetitive refactors (e.g., renaming a function across 20+ files, updating the same pattern in many modules), delegate to a sub-agent with clear per-file instructions and a checkpoint after every batch. Verify each batch's output before starting the next.
```