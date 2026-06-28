---
name: app-reliability-audit
description: >
  Use when asked to audit a codebase for reliability, resilience, or production-readiness issues.
  Triggers: "audit my codebase", "find reliability issues", "review for production", "check for
  race conditions / timeouts / N+1 queries", "SRE review", "find vulnerabilities", "trace user
  flows". Outputs two artifacts: `audit_progress.md` and `audit_traces.md`. NEVER executes code
  changes. Do NOT use for security pen-testing, CVE scanning, or static type-checking.
---

# App Reliability & Resilience Audit Skill

## Core Philosophy
Trace real user flows end-to-end. Production failures are cascades of small gaps — a missing timeout, a swallowed exception, a schema mismatch — not single catastrophic bugs. Avoid alarm fatigue (flagging every TODO as HIGH) and false confidence (stopping at the controller layer).

---

## What Counts as a Flow
A flow **must** start at an entry point (route/UI event/CLI), pass through service/logic layers, and **end at a storage or external service boundary**. Tracing half a flow is an audit failure.

---

## Phase 0 — Learn the Project First (Mandatory)

### 0-A. Build the Structural Map
Answer these questions by reading landmark files only:
1. **What kind of project?** — `package.json`, `pyproject.toml`, etc. Note frameworks, ORMs, HTTP clients, AI SDKs.
2. **Service boundaries?** — `docker-compose.yml`, `.env.example`, `config/`. List every external service.
3. **Entry-point hierarchy?** — Read routing files first (`routes`, `router`, `app`, `server`, `main`).
4. **Data models?** — `*.prisma`, `models.py`, `*.schema.ts`, `types.ts`. These are ground truth.
5. **Total file count?** — Run `git ls-files --cached --others --exclude-standard | wc -l`.

Write findings into the **Project Profile** section of `audit_progress.md`.

### 0-B. Learn the Documentation Pattern
Read 2–3 well-documented files to capture: comment style, error message format, naming conventions, logging pattern (structured vs. plain), return type conventions (tuples / exceptions / Result types), and test coverage. Record in **Project Patterns**. All remediations must mirror these patterns exactly.

### 0-C. Calibrate the Quality Baseline
Silently read one complete flow without flagging anything. Determine: Is error handling absent or just inconsistent? Are there known TODOs on critical paths? Is defensive coding the norm? A systemic pattern is always higher severity than an isolated one.

---

## Phase 1 — Initialize `audit_progress.md`

Create in project root before scanning any source file. Update after every file read.

```markdown
<!-- FINAL SUMMARY prepended here on completion -->

# Reliability Audit — Progress

## Artifacts
- **Findings Log**: `audit_progress.md`
- **Execution Traces**: `audit_traces.md`

## Current Status
| Field | Value |
|---|---|
| **Status** | Phase 0 / Scanning Flow N of 5 / ⛔ Terminated |
| **Files Read** | X / [Total] (Z%) |
| **Flows Completed** | Y / 5 |

## Project Profile
- **Language / Runtime:**
- **Framework:**
- **ORM / DB Client:**
- **External Services:**
- **Total Project Files:**
- **Key Risk Areas:**

## Project Patterns
- **Error handling:**
- **Logging:**
- **Naming conventions:**
- **Return conventions:**
- **Test coverage:**

## Execution Queue
### ✅ Completed Flows
### 🔍 Current Flow: `FLOW-NNN` — [Description]
_(Strike through completed files; mark next with `← NEXT`)_
### ⏭️ Upcoming Flows

## Audit Log
_(Append-only — see mutation rules below)_
```

### Document Mutation Rules
| Section | Rule |
|---|---|
| Current Status | Overwrite on every file read |
| Project Profile / Patterns | Fill once; overwrite with `*(revised)*` if corrected |
| Execution Queue | Strike through completed files; never delete entries |
| Audit Log | **Append only.** Add an `**Updated:**` block below (never rewrite) if: severity escalated, blast radius changed, or finding is partially resolved. |

---

## Phase 1.5 — Initialize `audit_traces.md`

```markdown
# Reliability Audit — Flow Traces
### 🔍 Trace — FLOW-001: [Description]
```

Rules: Every trace needs a unique Flow ID. Log every file transition with function and action. Never read the full file if >100 lines — grep the Flow ID and read a 50-line window.

---

## Phase 2 — Execution Loop

Repeat until a budget limit is hit:

**2-A. Select Next File** — Follow the actual call chain (imports/function calls), not alphabetical order. Three consecutive dead ends → trigger termination.

**2-B. Read and Analyze** — Apply all seven audit categories to every file.

**2-C. Record and Extend** — Append findings to Audit Log. Add downstream files to queue. Update `audit_traces.md`. Strike through current file. Increment file count.

**2-D. Check Budget**
```
flows_completed >= 5    → TERMINATE
files_read >= BUDGET    → TERMINATE  (BUDGET = max(25, 5% of total files))
dead_ends >= 3          → TERMINATE
```
A flow is complete when the trace reaches the DB/storage layer or an external service call.

---

## Reasoning Before Flagging

Before writing any finding, run this internal reasoning chain. The goal is to distinguish a real flaw from a stylistic preference or a missing feature.

**Step 1 — What is the intended behavior?**
Read the surrounding code to understand what this function is supposed to do. A missing null check is only a flaw if `null` can actually arrive here — if the upstream contract guarantees it won't, it is not a finding.

**Step 2 — What input makes this break?**
Concretely name the input or condition that triggers the failure. "An empty array", "a concurrent second request", "a 504 from the AI API". If you cannot name the input, you do not have a finding yet — keep reading.

**Step 3 — What actually happens when it breaks?**
Trace the failure forward: does it throw and propagate cleanly? Does it swallow silently and return corrupted data? Does it partially write to the DB and leave it in an inconsistent state? The failure mode determines severity, not the code pattern alone.

**Step 4 — Is this the right layer to fix it?**
Sometimes a missing check in layer B is a symptom of a design gap in layer A. Flag it at the layer where the fix is most durable and least likely to be bypassed by a future caller.

**Step 5 — Is this already handled elsewhere?**
Check if the same concern is addressed by middleware, a base class, a wrapper, or a DB constraint. Flagging an issue that is already guarded upstream is noise. Confirm the guard exists before skipping.

**Step 6 — Is this a flaw or a choice?**
Some patterns look wrong but are intentional tradeoffs: an unbounded query on a table that will never exceed 50 rows, a missing timeout on an internal loopback call, optimistic updates with client-side rollback. If the code shows signs of intentionality (comment, related config, matching test), downgrade or skip the finding and note the assumption.

Only after passing all six steps should you write a finding.

---

## The Nine Audit Categories

### 1 — Schema & Model Alignment
Check every data boundary crossing:
- **Frontend → API**: field names, casing, required vs. optional mismatches
- **Pydantic / TS Optionality**: logically required fields (`project_id`, `user_id`) must not be `Optional`
- **API → Service**: destructured fields match service function signature
- **Service → DB**: ORM model matches DB column names, types, and nullability
- **AI Response → DB**: AI output validated against schema before persistence
- **API Response → Frontend**: DTO field names and types match frontend expectations

### 2 — Exception & Error Handling
Every error must bubble up, be logged with context, or be explicitly handled. Flag:
- Empty catch blocks or `.catch(() => {})` — CRITICAL on write/payment/auth paths
- Unawaited promise-returning calls
- Error messages with no user/operation/input context
- Caller receiving a success response when an error was caught and not re-thrown

### 3 — Timeout & Back-Pressure
Every cross-process call needs an explicit timeout: HTTP calls, DB queries on large datasets, queue polls, remote file I/O. Also check:
- Retry logic without exponential backoff + jitter
- No circuit breaker on high-traffic AI/payment dependencies
- Unbounded loops over DB records with no chunking or pagination

### 4 — Database Safety
- **N+1 Queries**: a loop containing an individual DB call where a single bulk query would serve the same purpose
- **Missing Transactions**: two or more writes that must succeed or fail together with no wrapping transaction
- **Connection per request**: DB client constructed inside a per-request handler instead of once at startup
- **Missing indexes**: filter/sort fields on large tables with no index; identify by cross-referencing query predicates against the schema definition

### 5 — Concurrency & Race Conditions
- Check-then-act patterns without atomicity (fix: `upsert` + unique constraint)
- Missing idempotency keys on payment/order/subscription endpoints
- Shared mutable state without synchronization in a multi-process or multi-thread context
- Optimistic concurrency without version/timestamp validation before write

### 6 — Rate Limiting & Back-Pressure
- Public endpoints without rate limiting middleware (flag only if the endpoint triggers writes or expensive computation)
- Background jobs without a concurrency cap
- Outbound calls to rate-limited upstreams (AI, payments) without a 429 handler or token bucket
- Webhook receivers without signature verification

### 7 — Performance & Efficiency
Flag only when the inefficiency will cause measurable degradation under realistic load, not theoretical load.
- **Redundant computation**: the same value derived more than once within a single request lifecycle with no memoization. Check for repeated calls to the same pure function, repeated DB reads for the same record within a flow, and repeated serialization of the same object.
- **Over-fetching**: query selects all columns (`SELECT *`) or fetches an entire ORM relation when only 1–2 fields are consumed downstream. Flag only when the relation is large or the endpoint is high-traffic.
- **Unnecessary sequential I/O**: two or more independent async calls (DB, external API) executed in series when they could be parallelized. Identify by looking for `await a(); await b();` where `a` and `b` do not depend on each other's output.
- **Hot path re-initialization**: config parsing, regex compilation, schema validation object construction, or SDK client initialization happening inside a function called per-request. These belong at module load time.
- **Unbounded memory accumulation**: data appended to an in-memory structure across iterations with no flush or size cap — most dangerous in streaming handlers and background jobs.
- **Blocking I/O on async thread**: synchronous file reads, `JSON.parse` on very large payloads, or CPU-heavy transforms running on the main event loop without being offloaded.

### 8 — Code Duplication & Abstraction Flaws
Flag only when duplication creates a real divergence risk, not merely an aesthetic one.
- **Diverged duplicates**: the same logic implemented in two or more places where one has been updated and the other has not (detectable by comparing logic, not by string matching). This is the only duplication that is an immediate reliability risk.
- **Inline reimplementation of a utility that already exists**: the project already has a `formatDate` or `buildQueryParams` utility but a new function re-implements it locally. Flag with the location of the existing utility.
- **Copy-pasted validation without a shared schema**: the same input shape validated in two different places with slightly different rules. One will drift. The fix is a shared validator, not just documentation.
- **Parallel type hierarchies**: a DB model, a service DTO, and an API response type that represent the same entity and are manually kept in sync. Flag when they have diverged or when there is no mapper function and transformation is done inline at multiple sites.
- **Repeated error-handling boilerplate**: try/catch blocks with identical structure wrapping every function in a file. Flag as an abstraction opportunity — a higher-order wrapper or middleware would centralize this without duplicating it.

### 9 — Logic Flaws & Behavioral Correctness
These are the hardest to find and the most damaging. They do not look like bugs. They look like working code.
- **Incorrect boundary conditions**: off-by-one in pagination (returns N+1 or N-1 items), wrong comparison operator (`>` instead of `>=`), fence-post error in date range queries. Trace the math explicitly.
- **Assumption violations**: code assumes a sorted list, a non-empty array, a UTC timestamp, or a lowercase string — but the upstream does not guarantee this. Read the producer and the consumer side-by-side.
- **Silent default substitution**: a missing or null field is replaced with a default value (`|| 0`, `?? ''`, `or []`) without any log or signal. If the field being absent is unexpected, the default masks a real problem and makes it undiagnosable.
- **State machine violations**: an entity that can transition between states (order status, payment state, user role) with no enforcement of valid transitions. Any caller can write any state directly. Flag when there is no transition guard function or DB constraint.
- **Incorrect aggregation scope**: a `SUM`, `COUNT`, or `GROUP BY` that operates on the wrong dataset — typically caused by a missing `WHERE` clause, a join that multiplies rows, or a filter applied after aggregation instead of before.
- **Authorization logic applied after data fetch**: data is fetched from the DB and then filtered by ownership check in application code. A timing flaw or early return can leak the unfiltered result. The ownership predicate must be in the query, not after it.
- **Asymmetric create/delete**: a resource creation flow that writes to multiple tables or storage layers, but the deletion flow only cleans up some of them. Trace both paths when you see a create.

---

## Severity Rubric

| Severity | Condition |
|---|---|
| **CRITICAL** | Data loss, silent corruption, full outage, or authorization boundary crossed. The flaw produces the wrong outcome on every occurrence regardless of load. |
| **HIGH** | Significant user-facing failure or data inconsistency under realistic load or normal retry behavior. Requires a deploy or manual DB intervention to recover. |
| **MEDIUM** | Degrades gracefully under normal load but causes visible errors, measurable performance regression, or latent divergence that will surface as a bug when a related feature changes. |
| **LOW** | Code quality issue, abstraction gap, or optimization opportunity with no current user impact. Worth fixing to reduce future risk. |

**Systemic upgrade rule**: same flaw in 3+ files → escalate one level. State the reason and list the files explicitly.
**Do not escalate** a LOW to MEDIUM purely because it appears frequently if it still has no user impact. Frequency amplifies impact-based severity, not zero-impact severity.

---

## Finding Template

```markdown
### [CRITICAL | HIGH | MEDIUM | LOW] — <Short, specific title>

| Field | Detail |
|---|---|
| **Issue ID** | `ISSUE-NNN` |
| **Trace ID** | `FLOW-NNN` |
| **File** | `path/to/file.ts` lines X–Y |
| **Category** | Schema / Exception / Timeout / DB Safety / Race Condition / Rate Limiting / Performance / Duplication / Logic Flaw |
| **Systemic?** | Yes — also in `fileA`, `fileB` / No |

**The Flaw**
Describe the specific logic error or structural gap. State the input or condition that triggers it and what happens as a result. Include the relevant code (≤15 lines).

**Impact**
What fails, for how many users, how visibly, and whether recovery is automatic or requires intervention. Be concrete — "every checkout where the payment provider responds in >30s" is better than "timeouts".

**Remediation**
Before/after code snippet using the project's own error classes, logger, and naming conventions. If the fix requires a DB migration, schema change, or config update, say so explicitly.
```

---

## Flow Trace Template

```markdown
### 🔍 Trace — FLOW-NNN: [Short Description]

| Field | Detail |
|---|---|
| **ID** | `FLOW-NNN` |
| **Status** | In Progress / Trace Completed |
| **Primary File** | `router.py` |

| Step | File | Function | Action |
|---|---|---|---|
| 1 | `router.py` | `POST /resource` | Analyzed input validation. |
| 2 | `service.py` | `create_resource` | Traced business logic. |
| 3 | `store.py` | `save_to_db` | Verified atomic write and error bubbling. |

**What we were doing:** [2–3 sentences on the user flow simulated and reliability concerns tested.]
```

---

## Final Summary Block

Prepend to top of `audit_progress.md` when any budget limit is reached:

```markdown
<!-- ══════════════════════════════════════════════════════════════════ -->
## ⛔ FINAL SUMMARY — Audit Complete

**Terminated by:** Max Flows / Max Files / Dead End
**Files read:** X / [Total] (Z%) | **Flows completed:** Y / 5

### Overall Health: 🔴 Critical / 🟠 High Risk / 🟡 Moderate / 🟢 Healthy
_(One paragraph: most dangerous finding, most pervasive pattern, highest-density layer, isolated vs. systemic.)_

### Finding Counts
| Severity | Count |
|---|---|
| 🚨 CRITICAL | N |
| 🔴 HIGH | N |
| 🟠 MEDIUM | N |
| 🟡 LOW | N |
| **Total** | **N** |

### Top 3 Fixes — In Priority Order
1. **[File, lines]** — issue. Fix: action.
2. **[File, lines]** — issue. Fix: action.
3. **[File, lines]** — issue. Fix: action.

### Entry Points for Next Audit Run
- `path/to/file.ts` — why high-priority
<!-- ══════════════════════════════════════════════════════════════════ -->
```

Then send:
> **Audit paused — [limit] reached.** `audit_progress.md` contains [N] findings across [Y] flows ([X] files read). Most urgent: [one sentence on highest-severity finding]. To continue: start a new run using the queue in `audit_progress.md`.

---

## Per-File Checklist (run silently before marking any file done)

**Before checking anything — apply the reasoning chain first.** For each item below, only flag when you can name the specific input that triggers the flaw and the concrete failure that results.

```
SCHEMA & CONTRACTS
[ ] Every field read from input exists in the upstream type definition with a matching type
[ ] No logically required field (ID, ownership key, status) is marked Optional or nullable
[ ] AI/external response fields are validated against a schema before being persisted or returned
[ ] API response DTO matches what the frontend component actually consumes (check both sides)

EXCEPTION & ERROR HANDLING
[ ] No catch block that swallows without logging and re-throwing on a write, auth, or payment path
[ ] No promise-returning call missing await where a rejection would go unobserved
[ ] Every thrown error includes: what operation failed, for which entity, and with what input shape
[ ] No path where the caller receives a success response after an error was caught

TIMEOUTS & RESILIENCE
[ ] Every HTTP, DB (unbounded), queue, and remote file call has an explicit timeout at the call site
[ ] Every retry loop uses exponential backoff with jitter — not immediate re-attempt
[ ] High-traffic external dependencies (AI, payments) have a circuit breaker or fast-fail fallback

DATABASE SAFETY
[ ] DB client is not instantiated inside a per-request function
[ ] No loop that issues an individual DB query per iteration where a bulk query is possible
[ ] Every pair of writes that must be atomic is wrapped in a transaction
[ ] Filter and sort columns on large tables have corresponding index definitions in the schema

CONCURRENCY & CORRECTNESS
[ ] No check-then-act pattern without an atomicity guarantee (unique constraint or DB-level lock)
[ ] Every state-mutating endpoint that can be retried validates an idempotency key before executing
[ ] Every entity with discrete states has a transition guard — no caller can write arbitrary state directly
[ ] Ownership/authorization predicate is applied inside the DB query, not after the fetch

PERFORMANCE
[ ] No value derived more than once per request that could be computed once and passed down
[ ] No SELECT * or full relation fetch where only 1–2 fields are consumed
[ ] No two or more independent async I/O calls in series that could be parallelized
[ ] No SDK client, regex, config parse, or schema object constructed inside a per-request function
[ ] No in-memory structure that grows without a size cap or flush inside a loop or stream handler

CODE DUPLICATION & ABSTRACTION
[ ] No logic duplicated across files where one copy has been updated and the other has not
[ ] No inline reimplementation of a utility or validator that already exists in the codebase
[ ] No parallel type definitions for the same entity that are manually kept in sync without a mapper
[ ] No copy-pasted try/catch boilerplate where a shared wrapper or middleware would centralize it

LOGIC FLAWS
[ ] Boundary conditions are correct: pagination counts, date ranges, comparison operators
[ ] Every upstream assumption (sorted input, non-empty array, UTC timestamp) is verified or enforced
[ ] No silent default substitution masking a missing required value (`|| 0`, `?? ''`) without a log
[ ] Create and delete flows are symmetric — every table/store written on create is cleaned on delete
[ ] Aggregations apply filters before grouping, not after; joins do not multiply rows unintentionally

CONSISTENCY
[ ] Remediations use the project's error class, logger, naming convention, and return pattern
[ ] No TODO/FIXME on a reliability-critical path (treat as a finding at the appropriate severity)
```