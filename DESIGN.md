# DESIGN.md

UI design-system contract for agents. Source of truth for color, status, and component usage. If a pattern isn't here, it isn't approved — ask before inventing one. Pairs with `AGENTS.md` (that file governs code; this one governs how the UI looks/behaves). Consult before any component or style change; every conceptual change must trace to a specific request. Ship a change only when it passes the checklist.

---

## 1. Core rule + the four jobs of color

**Color is a signal, not decoration.** Two binding halves:

1. **Stateful element → color-code it, visibly.** Give it a subtly tinted surface corresponding to its state. Do not rely solely on a colored icon on a neutral background. Leaving a status visually neutral is a bug, not a safe default — this is the #1 failure mode.
2. **Stateless element → neutral.** Use neutral text, borders, and background surfaces. Coloring a stateless element falsely implies an event occurred.

"Muted" means low-saturation, flat, and calm — *not* colorless.

Before picking a style, identify which **job** the color is doing:

| Job | Answers | Source |
| --- | --- | --- |
| **Status** | "what state?" | Semantic status tones (Success, Info, Warning, Destructive, Neutral) |
| **Action** | "primary thing to click?" | Primary brand color — buttons, active nav, focus rings only |
| **Brand emphasis** | "featured/exceptional?" | Subtle accent styles — no state |
| **Identity** | "*what is this thing?*" | Fixed identity colors — never status/accent |

Status styles express *state* only. A technology tag, a gold tier, or a chart series represent **identity**, not "successes" or "warnings" — force them into a status style (or leave them neutral) and the visual mapping breaks.

---

## 2. The 8 Golden Rules (Shneiderman) — guiding principles

Treat these as **intent to apply broadly, not a checklist**. The right-hand column gives examples of what the principle looks like conceptually — extend each principle to cases not listed here using judgment.

| # | Principle | Looks like (examples — apply beyond these) |
| --- | --- | --- |
| 1 | Consistency | Same meaning → same treatment; reuse the *same icon* for the same concept, pick intuitive/conventional icons, keep terminology uniform, place recurring controls in the same spot. |
| 2 | Universal usability | Serve novices and experts alike — icon+color for quick scanning, keyboard shortcuts for power users, responsive layout wrappers, sensible defaults, accessible contrast. |
| 3 | Informative feedback | Acknowledge every action — callouts, alerts, badges, and descriptive toast notifications. Match the feedback's visual weight to the action's importance. |
| 4 | Closure | Group actions into clear beginning→middle→end; end flows with an explicit outcome; confirm completion rather than going silent. |
| 5 | Prevent errors | Make mistakes hard — validate early via schema, constrain inputs, gate destructive actions behind confirmation dialogs, disable and explain unavailable options. |
| 6 | Easy reversal | Prefer reversible affordances; support undo where feasible; label and confirm the irreversible ("can't be undone"). |
| 7 | User in control | No surprise state changes or hijacked flows; color reinforces named text, never replaces it; the user initiates, the UI responds. |
| 8 | Low memory load | Don't make people remember across screens — recognizable icons/labels, consistent placement, visible options over recall, one shared vocabulary. |

---

## 3. Status logic — the complete set (five, no more)

Never invent a sixth status; never fake a status with a raw, unmapped color. (Raw/fixed colors are fine for *identity* — a different job.)

| Status | Meaning |
| --- | --- |
| **Neutral** | Informational, no judgment |
| **Success** | Completed, approved, healthy |
| **Info** | In progress, awaiting action |
| **Warning** | Needs attention soon; not blocking |
| **Destructive** | Failed, rejected, blocking, irreversible |

Ensure background surfaces and foreground text share the exact semantic variables provided by the theme configuration to maintain accessible contrast.

---

## 4. Channel budget — up to two coordinated channels, one hue

* **Surface** (tinted background) and/or **Content** (icon+text in the same tone).
* Tinted surfaces are **encouraged** for stateful callouts, alerts, and badges. A bare colored icon on a neutral background is the *minimum*, suitable only for dense rows, never as the default.
* Text may stay neutral on a tinted surface (to keep the UI calm); never introduce a *second, clashing* hue in one element.

**Never use the third channel — this is what reads as neon/AI-generated:**

* No colored **border** on a tinted surface (the surface carries the tone; the border should be neutral or absent).
* No **glow / drop-shadow** halos (rely only on standard, subtle system shadows).
* No solid, highly saturated status fills as a background (solid fills = **buttons only**).
* No exaggerated border radiuses, thick borders, aurora gradients, or blurred "blobs".

If you encounter this styling while editing, flatten it to standard semantic variables.

---

## 5. Pattern catalog

* **Callout card** — per-item status/tip. *Default:* Tinted background, matching icon, standard text; no colored border. *Compact variant* (only when many stack in a grid): Neutral background and border, with the status tone confined to a small, tinted icon container.
* **Inline alert** — full-width form/page banner. Tinted background, icon and text in the same tone, no border, no separate icon container. The banner *is* the message.
* **Badge** — compact label. Tinted background, tinted text, tight padding, rounded corners, no border. A stateful label wears its tone; a pure *category* tag uses neutral styling (or an identity color).
* **Icon indicator** — dense rows/tables. Bare icon, no container, colored via the text/foreground semantic variable only.
* **Empty state** — always neutral: subtle background icon container, standard borders. An invitation, not a status — color here falsely implies an error.
* **Buttons** — one primary action per view; destructive solid fills are only for genuinely irreversible actions, never an ordinary "Save" or "Submit".

---

## 6. Brand emphasis — subtle accent (not a status)

Accent styling provides a subtle "featured/exceptional" highlight but carries no state. Never use it as the primary action color or a status tone. The primary brand color (the only highly saturated fill) is reserved for buttons, active navigation, and focus rings.
*Rule of thumb:* If removing the highlight loses info about *what happened*, it's a status; if it only loses a *compliment*, it's an accent.

---

## 7. Identity color — when the color *is* the thing

Integrations, category/label tags, tier/rank (gold/blue/slate), and chart series. These mean "*what this is*," not "*what state*" — and must **never** use theme status/accent/primary tokens, which get dynamically recolored by themes and silently corrupt the mapping.

* **Recurring/shared → add a dedicated token to the global theme** (e.g., specific brand colors, data-viz chart colors) — centralized but decoupled from the dynamic recoloring theme.
* **One-off → use fixed color palettes with defined light/dark variants.** Choose tones that maintain contrast regardless of the user's theme.
* This is the **only** sanctioned use of raw/fixed colors. Still obeys the channel budget rule — one hue, no stacked borders, no glow. Brand color rides the logo or tiny indicator, not a massive surface.

---

## 8. Decision table

| Situation | Pattern | Channels |
| --- | --- | --- |
| Page-level tip / stateless context | Callout, Neutral | Neutral surface |
| Status tied to one item | Callout, Tinted, Semantic tone | Surface + tone |
| Many item-statuses in a grid | Callout, Compact variant | Icon container only |
| Form saved/failed / plan-limit banner | Inline alert | Surface + text |
| State or category label | Badge | Surface + text |
| "Featured"/"Exceptional" | Accent badge | Accent ≠ status |
| Color that *is* the thing (integration/category/tier) | Identity color | Own stable hue, never a status |
| Dense list/table row state | Icon indicator | Icon only |
| Irreversible action | Destructive button + Confirmation dialog | Solid fill (buttons only) |
| Nothing here yet | Empty state | Neutral |

---

## 9. Styling, Tokens, and Copywriting Guidelines

### Primitives & Page Layout

* **Primitives Only:** Always utilize the designated design system primitives (buttons, inputs, cards). Do not write raw HTML elements or use unauthorized third-party libraries for core UI pieces.
* **Layout Wrapper:** Consistently wrap all user-facing route pages inside standard page and header containers to maintain responsive spacing.
* **Component Architecture:** Adhere to strict separation of concerns for form validation, state management, and network isolation.

### Styling & Design Tokens

* **Semantic Variables First:** Reach for semantic primitives (foreground, muted, background) before legacy or custom variables. Keep primary styles for actions, and accent styles for subtle hovers/surfaces.
* **Do Not Mix Aliases:** Never use raw color utilities or legacy text aliases in new or edited components. Stick strictly to the defined status semantics.
* **No "AI Default / Vivid Glow / Aurora" Styling:** Keep the UI clean and flat (Notion-like). Do **not** use neon/luminous highlights, glowing box-shadows, iridescent multi-stop gradients, or decorative blurred gradient "blobs". Use solid token surfaces, thin borders, and standard subtle shadows.

### UI Microcopy & Progressive Disclosure

* **Short & Actionable:** UI copy is scannable, not prose. Prefer short imperative phrases over full sentences. Default to positive framing (state what an action *does*).
* **Negative Framing for Cautions:** When a limitation or caveat is critical, use direct negative framing to command attention, paired with appropriate status styling. Never stack a benefit and a caveat into one convoluted sentence.
* **Separate the Caveat from the Action:** Keep a control's label strictly to the action itself. Surface limitations or nuances separately — either as a compact status note beside the control, or behind an on-demand affordance (tooltip, popover, info dialog).
* **Lean on Visual & Contextual Cues:** Copy never works alone. Let the surrounding layout, icons, and status colors convey intent at a glance to cut the user's reading load. Add words only where visual cues would be ambiguous.

### UI Feedback Notifications

* **Descriptive Messages:** Status notifications (toasts) must be descriptive and follow a definitive action pattern (e.g., `"[Noun] [Verb]"`, such as `"Project updated successfully"`). Never use generic titles like `"Error"` or `"Success"`.

---

## 10. Pre-flight checklist

* [ ] Every stateful element wears its correct tone on a **tinted surface** — nothing meaningful left neutral.
* [ ] Every stateless element is neutral; no color implies a nonexistent state.
* [ ] No third channel: no colored border on a tinted surface, no glow, no second hue, no solid status fill outside buttons, no exaggerated radiuses / aurora / blobs.
* [ ] Identity color uses fixed/dedicated palettes with light/dark variants — never status/accent/primary, never left arbitrarily neutral.
* [ ] Only approved design system primitives utilized; strictly wrapped in standard layout containers.
* [ ] Tokens pulled exclusively from the global theme; no raw colors/utilities except for identity styling.
* [ ] Copy is terse + action-first; caveats are separated; feedback follows the `"[Noun] [Verb]"` pattern.
* [ ] Destructive actions are explicitly confirmed and reversible where possible.
* [ ] Frontend types exactly mirror backend data models without type-check failures.