# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Clean Coding Standards & Practices

This guide outlines generalized, production-ready coding standards, architecture principles, and anti-patterns for modern full-stack applications utilizing a Python backend and a TypeScript/React frontend.

---

## 1. Backend Standards (Python)

### Import Management

* **Top-Level Hoisting:** Always place all `import` statements at the absolute top of the file. Never embed imports inside functions, methods, or conditional blocks.
* **Grouping & Ordering:** Structure imports cleanly in three distinct groups, separated by a blank line:
1. Standard library modules (e.g., `os`, `sys`, `datetime`).
2. Third-party packages (e.g., `pydantic`, `fastapi`).
3. Local application modules using absolute paths.



### Modern Pydantic (V2+) Data Validation

* **Syntax Compliance:** Exclusively use Pydantic V2 paradigms. Utilize `.model_dump()` instead of `.dict()`, and `.model_dump_json()` instead of `.json()`.
* **Field Validation:** Implement field-level validation using the `@field_validator` decorator. Ensure all validators include explicit type hints for the value being validated.
* **Configuration:** Use `pydantic_settings` for environment configuration management via `BaseSettings`.

### Strict Request/Response Isolation (DTO Pattern)

* **Dedicated Schemas:** Always separate data transfer structures into explicit input schemas (`*Request`) and output schemas (`*Response`).
* **ORM Encapsulation:** Never expose raw Database/ORM models directly to the presentation layer. Map ORM objects to output schemas within the service layer to prevent accidental data leaks (e.g., password hashes, internal IDs).

### Complete Documentation & Type Hinting

* **Static Analysis:** Every function, method, and variable must have explicit type hints. Avoid the use of `Any` where possible; use `Optional`, `Union`, or generics instead.
* **Standardized Docstrings:** Public functions and methods require structural docstrings detailing the summary, input arguments (with types), and return definitions.
```python
def calculate_metrics(user_id: str, threshold: float) -> dict[str, float]:
    """
    Calculates aggregate operational metrics for a specific user.

    Args:
        user_id (str): The unique identifier of the target user.
        threshold (float): The lower boundary limit for metric inclusion.

    Returns:
        dict[str, float]: A dictionary containing computed metric key-value pairs.
    """

```



### Deterministic Datetime Handling

* **Timezone Awareness:** All backend timestamps must be timezone-aware, defaulting to UTC.
* **Serialization:** Ensure all `datetime` fields payload definitions consistently serialize to ISO 8601 formatting with a explicit `'Z'` suffix (e.g., `YYYY-MM-DDTHH:mm:ss.sssZ`).

---

## 2. Frontend Standards (TypeScript & React)

### Strict Type Safety

* **No Implicit Any:** Enable strict compiler configurations. The use of `any` is strictly prohibited. Use `unknown` for unpredictable data structures and execute runtime type guards.
* **Contract Synchronization:** Ensure TypeScript `interface` and `type` definitions exactly mirror backend API response models to maintain tight end-to-end type contract stability.
* **Type & Syntax Verification:** Always run `pnpm run typecheck` to verify that any code changes are free of compilation, type mismatch, or syntax issues.

### Primitive Component Usage

* **UI Primitives Only:** For primitive components (e.g., buttons, inputs, cards, dialogs, dropdowns, tables, select elements, etc.), you must exclusively import and use the components located in [`src/components/ui`] (such as `<Button>`, `<Input>`, `<Card>`, etc.) instead of writing raw HTML elements (like `<button>`, `<input>`, or raw divs styled as cards) or importing them from third-party libraries. This ensures consistent styling, accessibility, and theme compliance across the entire application.


### Page Layout Consistency

* **Container and Header Wrapper:** Every user-facing route page must be wrapped inside a `<PageContainer>` and utilize a `<PageHeader>` to ensure consistent padding, layout max-widths, and standard typography across both mobile and desktop viewports.


### Component Anatomy & Layout Lifecycle

* Maintain a predictable and unified structural layout inside all React components to optimize readability:
1. **State Hooks:** `useState`
2. **Refs:** `useRef`
3. **Contexts:** `useContext`
4. **Memoized Logic:** `useMemo` and `useCallback`
5. **Side Effects:** `useEffect`
6. **Event Handlers:** Component-specific callback logic
7. **JSX Render Tree:** The returned presentation layout



### API Layer Isolation

* **Decoupled Network Requests:** Components must never execute network requests (`fetch`, `axios`) directly.
* **Abstracted Data Fetching:** Encapsulate all network orchestration within abstract API modules, custom hooks, or state-management layers. Components should consume data and loading states as clean, reactive inputs.

### Schema-Driven Form Validation

* **Declarative Validation:** Couple form states with declarative schemas (such as Zod) via form ecosystem engines (like `react-hook-form`).
* **Inferred Typing:** Dynamically infer TypeScript types directly from validation schemas to maintain a Single Source of Truth for frontend inputs.

### Styling & CSS Variables
* **Static Identity Colors Use Fixed Colors, Not Theme Vars:** When a color must stay stable to carry meaning, category coding, or any "this color *is* the thing" mapping — do **not** tie it to the theme `accent` / `primary` variables, which get recolored frequently and will silently shift that meaning. Use fixed Tailwind colors instead (e.g. `bg-amber-500/10` + `text-amber-600 dark:text-amber-400`), always with `dark:` variants, and choose tones that keep contrast regardless of the current accent. Theme vars (`primary`/`accent`) are for brand/action surfaces that *should* follow the theme. Define a small fixed palette constant.
* **No "AI Default / Vivid Glow / Aurora" Styling:** Keep the UI clean and flat (Notion-like). Do **not** use neon/luminous highlights, glowing box-shadows or halos, iridescent/aurora multi-stop gradients, or decorative blurred gradient "blobs". Use solid token surfaces. If you encounter this glowy styling, flatten it.
* **Custom Typography Utilities (Tailwind v4):** Prefer custom pre-configured font size utilities like `text-2xs` (0.625rem / 10px) and `text-3xs` (0.5rem / 8px) for extremely compact status labels, timestamps, metadata counts, and badge text rather than using arbitrary values like `text-[0.625rem]` or standard `text-xs` (which can be too large for small side-panels or status widgets).

---

## 3. General Architecture Principles

### Separation of Concerns (SoC)

* **Backend Layering:** Enforce a strict unidirectional architectural flow: **Presentation Layer (Routers/Controllers) $\rightarrow$ Business Logic Layer (Services) $\rightarrow$ Data Access Layer (Repositories/Stores)**. Layers must never skip a step or call upstream dependencies.
* **Frontend Layering:** Separate logic from layout: **Routing Page $\rightarrow$ Orchestration Component (State Management) $\rightarrow$ Custom Hook (Business Logic) $\rightarrow$ API Client (Data Fetching)**.

### Zero-Fluff, Clear Formatting

* Code should speak for itself. Avoid decorative comment structures, large dividers, or redundant labeling. Rely on clean naming conventions and modular functions to dictate intent.

---

## 4. Operational Anti-Patterns (NEVER DO THESE)

* **Inline Python Imports:** Never obscure code dependencies by embedding `import` statements inside functions, except when explicitly dealing with rare, unresolvable circular dependency edge cases.
* **Raw Database Access in Routes:** Presentation layer endpoints must never talk directly to data engines or ORM execution contexts. All queries must flow through dedicated service and data-access layers.
* **Component-Bound Network Calls:** Never bind raw HTTP clients directly to interactive UI components; this creates tight coupling and compromises component testability.
* **Generic UI Feedback Toasts:** Never throw generic titles like `"Error"` or `"Success"` in UI notification toasts. Status toasts must be descriptive and follow a definitive action pattern (e.g., `"[Noun] [Verb]"`, such as `"Project updated successfully"`).
* **Out-of-Sync Models:** Never modify backend API schemas without making corresponding adjustments to frontend type definitions. Unsynchronized data layers breach end-to-end type safety.
* **CSS Variables Source:** Always use the standard theme variables exposed in `src/index.css`. If new variables are needed, add them directly in `src/index.css`.
* **Misused Tokens & Glow Styling:** Never use `accent` as the brand/action color (it is the subtle surface token — use `primary`), never use raw color utilities (`bg-blue-50`, hex) or legacy `text-text-*` aliases when a shadcn primitive exists, and never introduce glowing/neon/aurora effects or decorative blurred gradient blobs.
---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.