# AGENTS.md

Behavioral and architectural contract for AI agents. This document governs **code structure, logic, and operational behavior** to reduce common LLM coding mistakes.

> [!IMPORTANT]
> **Separation of Concerns:** This file governs *logic and architecture*. Visual layout aesthetics, color tokens, microcopy, and UI patterns are strictly governed by **[DESIGN.md](https://www.google.com/search?q=./DESIGN.md)**.
> * Do not make design, layout, or color decisions based on assumptions.
> * Always consult `DESIGN.md` before making component or styling changes.
> * Code changes must not sneak in unauthorized re-styling.
> 
> 

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment, but never sacrifice architectural integrity.

---

## 1. Core AI Behaviors

### 1.1 Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

* State your assumptions explicitly before writing code. If uncertain, ask.
* If multiple interpretations of a prompt exist, present them — do not pick silently.
* If a simpler approach exists, say so. Push back when the user asks for something unnecessarily complex.
* If something is unclear, stop. Name what is confusing and ask for clarification.

### 1.2 Simplicity First

**Write the minimum code required to solve the problem. Nothing speculative.**

* Build no features beyond what was explicitly requested.
* Create no abstractions for single-use code.
* Add no "flexibility" or "configurability" that wasn't asked for.
* Do not write error handling for mathematically or logically impossible scenarios.
* *Self-Correction:* If you write 200 lines and it could be 50, rewrite it before responding.

### 1.3 Surgical Changes

**Touch only what you must. Clean up only your own mess.**

* Do not "improve" adjacent code, comments, or formatting just because you are in the file.
* Do not refactor things that aren't broken. Match the existing style, even if you'd do it differently.
* If you notice unrelated dead code, mention it to the user — do not delete it unilaterally.
* **Orphan Rule:** Remove imports, variables, or functions that *your* changes made unused. Do not remove pre-existing dead code unless asked.
* *The Test:* Every changed line should trace directly back to the user's explicit request.

### 1.4 Test Synchronization & Integrity

**Update tests alongside working changes. Never leave them broken or out of sync.**

* When you modify a component, service, or function, you *must* immediately update its corresponding test files to reflect the new state.
* Ensure tests *actually* align with the current implementation. Do not blindly write assertions that pass against outdated logic.
* Never use `test.skip()`, `@ts-ignore`, or comment out failing tests just to make the test suite pass. Fix the underlying logic or update the test.
* Verify that mock payloads, expected return types, and UI assertions exactly match the modifications you just made.

### 1.5 Goal-Driven Execution

**Define success criteria. Loop until verified.**

* Transform tasks into verifiable goals (e.g., "Add validation" $\rightarrow$ "Write tests for invalid inputs, then make them pass").
* For multi-step tasks, state a brief plan before executing:
```text
1. [Step] → verify: [check]
2. [Step] → verify: [check]

```


* Strong success criteria let you loop independently. Weak criteria ("make it work") require constant user clarification.

---

## 2. General Architecture Principles

* **Strict Unidirectional Flow (Backend):** Presentation Layer (Express Routers/Controllers) $\rightarrow$ Business Logic Layer (Services) $\rightarrow$ Data Access Layer (Repositories/Stores). Layers must never skip a step or call upstream dependencies.
* **Logic/Layout Separation (Frontend):** Routing Page $\rightarrow$ Orchestration Component (State Management) $\rightarrow$ Custom Hook (Business Logic) $\rightarrow$ API Client (Data Fetching).
* **Zero-Fluff Formatting:** Code should speak for itself. Avoid decorative comment blocks (e.g., `// === SERVICES === //`), large dividers, or redundant labeling. Rely on clean naming conventions.

---

## 3. Backend Standards (TypeScript & Express)

### 3.1 Type Safety & Imports

* **No Implicit Any:** Enable strict compiler configurations. The use of `any` is strictly prohibited. Use `unknown` for unpredictable data structures and execute runtime type guards.
* **Import Grouping:** Place all `import` statements at the absolute top of the file. Grouping order: (1) Node built-ins, (2) Third-party packages, (3) Local internal modules.

### 3.2 Express Layering

* **Lean Controllers:** Express route handlers must strictly handle HTTP concerns only: parsing `req.body`/`req.params`, calling a service, and returning a formatted `res`.
* **Business Logic:** All business logic, database queries, and external API calls must live in a dedicated Service layer.

### 3.3 Validation & Error Handling

* **Zod Schema Validation:** Validate all incoming request payloads (body, query, params) using Zod via a dedicated validation middleware *before* the request reaches the controller.
* **Type Inference:** Dynamically infer TypeScript types (`z.infer`) directly from validation schemas to maintain a Single Source of Truth.
* **Global Error Routing:** Never use `res.status(500).send()` directly inside a controller. Rely on Express 5's native asynchronous promise rejections to forward errors downstream to a single, centralized error-handling middleware.

### 3.4 Deterministic Time

* **Timezone Awareness:** All backend timestamps must be timezone-aware, defaulting to UTC. Ensure all date fields serialize to ISO 8601 formatting with an explicit `'Z'` suffix (e.g., `YYYY-MM-DDTHH:mm:ss.sssZ`).

---

## 4. Frontend Standards (TypeScript & React)

### 4.1 UI & Design System Adherence

* **Consult DESIGN.md:** All layout, color, typography, and status logic must conform to `DESIGN.md`.
* **UI Primitives Only:** For primitive components (buttons, inputs, cards, dialogs, etc.), you must *exclusively* import and use the components located in `src/components/ui`. Never write raw HTML elements (like `<button>`, `<input>`, or raw divs styled as cards) or import them from unapproved third-party libraries.
* **Page Layout:** Every user-facing route page must be wrapped inside a `<PageContainer>`

### 4.2 React Component Architecture

Maintain a predictable structural lifecycle inside all React components:

1. **State Hooks:** `useState`
2. **Refs:** `useRef`
3. **Contexts:** `useContext`
4. **Memoized Logic:** `useMemo` and `useCallback`
5. **Side Effects:** `useEffect`
6. **Event Handlers:** Component-specific callback logic
7. **JSX Render Tree:** The returned layout

### 4.3 Network & Data Integrity

* **Contract Synchronization:** Ensure frontend TypeScript interfaces/types exactly mirror backend API response models. Run `npm run typecheck` to verify changes.
* **Decoupled Network Requests:** Components must never execute network requests (`fetch`, `axios`) directly. Encapsulate network orchestration within abstract API modules, custom hooks, or state-management layers.
* **Schema-Driven Forms:** Couple form states with declarative Zod schemas via `react-hook-form`. Infer TypeScript types directly from these schemas.

---

## 5. Operational Anti-Patterns (STRICTLY FORBIDDEN)

1. **Inline Dynamic Imports:** Never obscure dependencies by embedding `require()` or `await import()` inside functions (except for rare, explicitly stated circular dependency edge cases).
2. **Raw DB Access in Routes:** Express controllers must never talk directly to data engines (Prisma, Mongoose, SQL). Queries must flow through services.
3. **Component-Bound Network Calls:** Never bind raw HTTP clients directly to interactive UI components.
4. **Out-of-Sync Models:** Never modify backend API schemas without making corresponding adjustments to the frontend type definitions.
5. **Out-of-Sync Tests:** Never submit working code changes while leaving the corresponding test files outdated, skipped, or broken.
6. **Rogue Styling:** Never introduce arbitrary hex codes, custom Tailwind configuration extensions, or inline styles without consulting `DESIGN.md`.