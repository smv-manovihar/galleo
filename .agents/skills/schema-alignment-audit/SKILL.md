---
name: schema-alignment-audit
description: >
  Use when asked to audit how data shapes agree (or don't) across DB → server → wire → client.
  Triggers: "audit our schema alignment", "backend and frontend types don't match", "are we
  losing data in the API", "why is this payload so big", "find dead fields", "check our API
  contracts", "is the DB the source of truth", "find backward-compat cruft". Outputs two
  artifacts: `schema_audit.md` and `contract_map.md`. NEVER edits code or migrations. Do NOT use
  for DB performance tuning, index design, or auth/permission review.
---

# Backend ↔ Frontend Schema Alignment Audit

## Core Philosophy
Audit **contracts, not files**. A contract is one data shape crossing a boundary, traced end to end: `DB column → server model → serializer/DTO → wire payload → client type → client read site`. Bugs live in the joints, not the layers — a nullable column read as required, a `numeric` flattened to float, a field the UI stopped reading two quarters ago and the server still hydrates.

Most individual mismatches are **symptoms**. The disease is a broken truth chain: the same shape authored by hand in three places with nothing forcing agreement. Diagnose the chain first (Phase 0), then every finding either points back to it or is genuinely local.

Runs **one contract at a time** with a **checkpoint after each**. Supports **checkpoint mode** (pauses after each contract, waits for `continue`) and **continuous mode** (auto-proceeds without pausing). Reply `continuous` at any checkpoint to switch modes. No fixed cap — proceeds until the contract queue is exhausted or you pause. State lives entirely in the two artifacts, so a fresh session continues from the queue's first `pending` row.

## Output Economy
Write for a reader who scans. Artifacts and chat both use dense fragments, not prose.
- Findings: the 5 fixed lines (below). No restated code, no paragraph of reasoning.
- Aligned fields are **not** listed — one count line (`Aligned: 14/19`). Only verdicts ≠ OK get a row.
- Never paste a payload, type definition, or migration into the artifact. Cite `path:line`.
- Chat at a checkpoint: 3 lines — contract done + finding count by severity / next contract / prompt.
- No summaries of what you're about to do. No recap of the queue.

---

## Artifacts
- **`contract_map.md`** — the queue and the per-field verdicts. One section per contract. Also holds the **Truth Chain** and **Project Conventions** blocks from Phase 0.
- **`schema_audit.md`** — the findings, append-only, newest section last.

> No separate tracker. Next contract = first `pending` row in the queue table. A contract is done when its section has a per-field table and a `✔ audited` queue status.

---

## Evidence Rules (non-negotiable)
1. **Two ends or no finding.** Never assert a mismatch from one side. Read the producer *and* the consumer, or mark the finding `unverified` and name the file you couldn't reach.
2. **Dead is a claim about the whole world.** Before calling a field dead, check: client read sites, server write sites, tests/fixtures, and non-repo consumers (mobile builds, analytics/warehouse jobs, partner integrations, saved exports). If any consumer is outside this repo, severity caps at MED and confidence is `low`.
3. **Generated files are evidence, not truth.** If a type is generated, the mismatch is upstream. Cite the generator input, not the artifact.
4. **Don't grade intent.** A shim may be deliberate policy. Report the cost and the removal condition; don't assume it's an accident.
5. **Runtime beats reading.** If a coercion or truncation is ambiguous, say what one-line check would settle it (a sample row, a live payload) rather than guessing.
6. **Presence isn't persistence, persistence isn't enforcement.** A field appearing in a model or validator is not proof anything stores it — find the write path. A column existing is not proof the shape holds — find the constraint. State which of the two you actually verified.

---

## Phase 0 — Truth Chain & Queue (once)

**0-A. Map the truth chain.** Where is each shape authored, and what forces the layers to agree? Record in `contract_map.md`:

```
## Truth Chain
DB        <migration tool / path>
Server    <ORM models | hand-written structs>  ← generated from DB? Y/N
Wire      <OpenAPI/GraphQL/proto | undeclared> ← generated from server? Y/N
Client    <generated client | hand-written types> ← generated from wire? Y/N
Validation <where inbound payloads are checked; derived or hand-written>
Rating    generated | partial (N hand-maintained hops) | unenforced
Drift gate CI check exists? Y/N
```
Every hand-maintained hop is a `TRUTH` finding candidate, opened once here — not repeated per contract.

**0-B. Record conventions.** Casing at each hop, null-vs-absent policy, date/time and money representation, enum encoding, error envelope, pagination shape, id type. These are the yardstick; deviations become findings instead of taste arguments.

**0-C. Build the queue.** Enumerate boundaries (HTTP routes, GraphQL fields, RPC methods, event topics, form submits). Rank by risk, highest first:
writes > reads · money/PII/auth-bearing > cosmetic · hand-maintained hop > generated · high-traffic > rare · known-buggy > quiet.

```
| # | contract | surface | risk | status |
|---|---|---|---|---|
| 1 | POST /orders | order create | high | pending |
```

Checkpoint: report the rating, the queue length, top 5 contracts. Ask to proceed or reorder.

---

## Phase 1 — Audit one contract (repeat)

Trace the shape hop by hop. Read only the files on the path — never a whole directory.

**Per-field verdict table** in `contract_map.md`. Omit aligned fields; end with a count line.

```
### C1 · POST /orders
db `orders` → `api/models/order.py` → `api/schemas/order.py:31` → `web/src/types/order.ts:12` → `OrderForm.tsx`

| field | db | server | wire | client | verdict |
|---|---|---|---|---|---|
| total_amount | numeric(12,2) | Decimal | number | number | MIS-precision |
| total_amount | numeric(12,2) | Decimal | number | number | MIS-precision |
| gift_note | — | accepted | string | string | ORIGIN-discarded |
| tax_rate | jsonb.meta | dict | number | editable input | ORIGIN-unenforced |
| coupon_code | — | — | absent | string (required) | MIS-phantom |
| legacy_ref | varchar null | str? | str? | unread | DEAD? |
Aligned: 14/19. Unreachable: `partner_meta` (external consumer).
```

A `—` in the **db** column is never left bare — it resolves to `derived` (and then: is the client treating it read-only?) or to an `ORIGIN` finding. Same for a value that names a blob path or a non-authoritative store.

### Dimensions — what to look for

**ORIGIN · does the field have a durable home** — ask this *before* asking whether the types agree. Four directions, all four checked:
- **Accepted but not persisted** — client sends it, server's validator accepts it, no write path stores it. Silently discarded; the user thinks they saved. Always HIGH: a save that reports success and loses the value is worse than a rejection.
- **Read but not stored** — wire returns it, no column backs it. Legitimate if computed/derived — then confirm the client treats it read-only. If the client can *edit* a derived field, that's HIGH.
- **Stored but unreachable** — column exists, no contract surfaces it. Found by the reverse sweep (2-A), not by tracing.
- **Stored somewhere else** — the value's real home is a cache, blob column, another service, a config file, or hardcoded. Name the actual store; "the DB" may not be where it lives.

Then: **presence ≠ enforcement.** Grade the home, don't just confirm it — typed column with constraints · typed column, no constraint · JSON/blob column with no schema · schemaless collection with no validator · denormalized copy in an analytical store. Anything below a constrained column means the server, not the DB, is holding the invariant — record that and check the server actually does.

**Multi-store:** where a field lives in several stores, name which one is authoritative and which are derived. A write against a derived copy is a finding regardless of whether the types line up.

**MIS · misalignment**
nullability (nullable column ↔ non-optional type; `?` vs `| null` vs absent) · required/optional inverted between create and update · type width (int64→JS number, `numeric`→float, uuid→string with no format check) · enum drift (values in DB not in client union; no fallback branch) · date/time (naive vs tz-aware, epoch vs ISO, date vs datetime) · casing/naming drift with no mapper · phantom fields the client sends or reads that the wire never had · shape drift (single vs array, object vs id, wrapped vs bare) · defaults applied at one hop only.

**LOSS · data loss / corruption**
fields dropped in a mapper (spread + rename, `pick`, manual DTO missing a column) · precision/scale loss (decimal→float, bigint→number, microseconds→seconds) · tz dropped on the way in or out · `PUT`/full-object update clobbering fields the client never loaded · partial-update semantics missing (can't distinguish "set null" from "don't touch") · lossy enum/union fallback to a default that then gets written back · silent coercion in validators (`""`→null, `"0"`→0, truthy strings) · encoding/collation truncation at write · optimistic client state overwriting authoritative server fields · array order or dedup lost on round-trip.

**PAYLOAD · excessive content**
response fields no client reads (measure it — cite the read site count) · unbounded collections with no pagination or cap · nested expansion the caller didn't ask for · blobs/base64/HTML/raw markdown inline instead of a URL · server-internal fields leaked (audit columns, internal ids, flags, soft-delete columns) · duplicated data in the same document (embedded copy + reference) · full-object refetch where a delta or single field would do · per-row hydration to render a list of names · no field selection / sparse fieldset support on a wide resource · over-posting from the client (whole entity sent for a one-field edit).

**COMPAT · backward-compatibility marks**
paired old/new fields both populated · `v1`/`v2`/`_new`/`_old`/`legacy_` names · `@deprecated` with no removal date or owner · aliasing in the serializer to keep an old key alive · tolerant reads accepting three shapes for one field · version branches in client parsing · dual-write to two columns/tables · feature-flagged shapes where the flag is now permanently on/off · migration backfill code still shipping after the backfill finished.
For each: **removal condition** (what must be true to delete it) and whether it's now met.

**DEAD · dead fields**
column written never read · column read never written (always default) · wire field with zero client read sites · client type field never rendered or submitted · enum member with no producer · endpoint/param with no caller · fixture-only fields. Apply Evidence Rule 2.

**TRUTH · source-of-truth gaps**
shape hand-authored at ≥2 hops · client types hand-written against a generated or declared wire · validation rules duplicated (DB constraint, server validator, client validator) and already divergent · no schema/contract artifact at all · migration applied with no corresponding contract change · generated file edited by hand · no CI drift gate · seed/fixture data that no longer satisfies current constraints.

**HANDLING · essential API handling, both sides**

| | Server | Client |
|---|---|---|
| input | validate at the boundary, reject unknown fields where it matters, enforce DB constraints before write | validate before send; don't rely on server-only rules |
| output | stable error envelope, correct status codes, no stack/internal leak | parse/validate responses; handle the error envelope, not just `catch` |
| states | — | loading / empty / partial / error each rendered |
| failure | timeouts, transaction boundaries, no partial-write success | timeout, bounded retry (idempotent only), no infinite spinner |
| write safety | idempotency key on create, optimistic-concurrency token on update | send the version/etag; reconcile or reload on 409 |
| lists | pagination contract (cursor/total/has_more), max page size | consume the real contract, don't assume total or infer end from length |
| evolution | additive changes, unknown-field tolerance on read | ignore unknown fields, never break on new enum members |
| cache | cache/vary headers correct | invalidate after mutation; don't serve stale authoritative fields |
| types | one nullability story | no `any`/`unknown` cast that erases the contract; no non-null assertion at the boundary |

Swallowed errors (`catch {}`, `except: pass`, `.catch(() => null)`) on a data path are always a finding.

**1-B. Write findings.** Fixed 5-line shape, one blank line between:

```
### SA-07 · LOSS · HIGH · confidence: high
- Where: db `orders.total_amount numeric(12,2)` → `api/schemas/order.py:41` → `web/src/types/order.ts:12`
- What: Decimal serialized via float(); client re-sends the float on update
- Why: cents drift, then written back — DB is silently corrupted, not just displayed wrong
- Fix: serialize as string; parse to a decimal type client-side  · symptom-of: SA-01
```

Rules: `Where` is the path, not a sentence. `What` is the mechanism. `Why` is the consequence to a user or to the data — never a restatement of `What`. `Fix` is one line, no code. Add `symptom-of: <id>` when a TRUTH finding is the real cause. Add `blast: <n> call sites` when it's wider than the traced contract.

**Severity anchors** — calibrate against these, don't inflate:
- **HIGH** — data is lost, corrupted, or written back wrong; a write silently fails or clobbers; PII/money/auth field leaks or mismatches; unbounded payload that will fall over at real scale.
- **MED** — wrong or missing UI on a real path (crash on null, unhandled error, missing empty state); compat cruft with a met removal condition; over-fetch with measurable cost; hand-maintained hop on an active contract.
- **LOW** — dead field, cosmetic naming drift, tidy-up with no user-visible effect.

Nothing is HIGH because it's ugly. Nothing is LOW because it's old.

**1-C. Checkpoint.** Update the queue row to `✔ audited`. Then 3 lines:
```
C1 POST /orders — 2 HIGH, 3 MED, 1 LOW (SA-04…SA-09).
Next: C2 GET /orders (list) — expecting payload + pagination findings.
Continue?
```
In **checkpoint mode**: stop. Do not start the next contract unprompted. In **continuous mode**: auto-proceed to next contract (loop back to Phase 1).

---

## Phase 2 — Close out (queue exhausted or user stops)

**2-A. Reverse sweep (bottom-up).** The contract trace only finds fields something asks for. Now go the other way: for each table/collection touched by the audited contracts, diff its columns against the union of fields those contracts surfaced. Every unsurfaced column is one of — internal/audit (fine, note and move on) · surfaced by a contract still in the queue · genuinely orphaned (`ORIGIN-unreachable`, usually LOW, but HIGH if it's written by something and read by nothing while a feature appears to depend on it). One line per column, grouped. Skip nothing silently; an unexplained column is the cheapest place a whole missing contract hides.

Append to `schema_audit.md`, ≤12 lines total:
```
## Summary
Coverage   N/M contracts · reverse sweep: n columns unsurfaced (n orphaned) · unreachable: <list>
Counts     HIGH n · MED n · LOW n
Systemic   the 1–3 TRUTH findings most findings hang off, with dependent counts
Do first   3 findings, id + one clause each
Watch      anything unverified, and the one check that would settle it
```
No recommendations section, no roadmap — that's the fix skill's job. Say so in one line and stop.

---

## Project-Level Conventions

### Plans & Artifacts Folder
Place all plan documents and audit artifacts inside a dedicated folder at the project root that is gitignored. The recommended names are `.artifacts/` or `.scratch/` (add to `.gitignore`).

### Sub-Agent Usage
For broad exploration tasks (finding files, understanding file patterns, searching code), use a sub-agent with the minimum-cost model available to avoid context rot and preserve budget for the main task. For large repetitive refactors (e.g., renaming a function across 20+ files, updating the same pattern in many modules), delegate to a sub-agent with clear per-file instructions and a checkpoint after every batch. Verify each batch's output before starting the next.