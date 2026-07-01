# Handoff — Tessera Console

You're picking up a working React app, not starting from the spec. Read this first; the original design brief (`../README.md` and `../reference/`) is still the source of truth for *intended* behavior, but this file tells you what's **actually built**, where it lives, and what to watch out for.

## Run it

```bash
cd app
npm install
npm run dev
```

Open the printed `http://localhost:5173` (must be `http://localhost`, not `file://` — Ollama CORS and PDF text extraction both depend on it).

For real LLM classification (optional — keyword fallback + the sample set work without it):

```bash
ollama pull gemma3
OLLAMA_ORIGINS='*' ollama serve
```

If you already have a different model pulled, don't re-pull — point the app at it instead:
```js
localStorage.setItem('tessera_llm_model', 'gemma4:e4b'); // whatever `ollama list` shows
```
then reload. **This is a common gotcha**: if the model name in `localStorage`/default doesn't match what Ollama actually has, every classify call gets `{"error":"model '...' not found"}`, the request throws, and ingestion **silently falls back to the keyword classifier** — only a console warning (`[Tessera] local model unreachable...`) tells you. If classification looks "dumb," check the model name before assuming the code is broken.

`npm run build` / `npx tsc --noEmit -p tsconfig.app.json` both pass clean as of this handoff.

## What this app is

Tessera: a document-intelligence console for procurement/finance. Drop in (or load a deterministic 32-doc sample set of) purchase orders, invoices, goods-receipt notes, customs docs, and junk. It classifies each doc with a local Gemma model via Ollama (no API keys, keyword-classifier fallback if offline), runs a three-way match (PO → goods receipt → invoice) to find exceptions (duplicate invoice, missing PO, missing GRN, short delivery, price variance), and surfaces insights + a linkage graph of the whole batch.

Dark/emerald enterprise SaaS aesthetic. Schibsted Grotesk (UI) + JetBrains Mono (all data/IDs/money/labels). All design tokens are CSS variables in `src/index.css` under `@theme` (Tailwind v4 syntax) — change a color there and it propagates everywhere via `bg-emerald`, `text-coral`, etc.

## Sidebar nav / views (in order)

1. **Data lake** (`lake`) — intake + classification
2. **Reconciliation** (`recon`) — three-way match, exception cards
3. **Linkage** (`linkage`) — force-directed network graph of the whole batch
4. **Insights** (`insights`) — KPIs, charts, action queue
5. **Architecture** (`architecture`) — static diagram explaining the pipeline (marketing/onboarding page, no live data)
6. **Pitch deck** (`pitch`) — 15-slide sales deck, rebuilt in-app from the reference HTML

`View` type and the switch is in `src/lib/types.ts` / `src/App.tsx`. Adding a 7th view = add to that union, add a nav row in `Sidebar.tsx`, add a crumb in `Header.tsx`, add the render branch in `App.tsx`.

## File map

```
src/
  lib/
    types.ts          — TessDoc, DocFields, ReconGroup, View, GroupStatus — the core data shapes
    sample.ts          — buildSample(): the 32-doc deterministic demo dataset (8 PO "transactions")
    extractText.ts     — client-side text extraction (pdfjs-dist for PDF, raw read for text formats)
    classify.ts        — modelClassify() [Ollama call + prompt], heuristicClassify() [keyword fallback], explain()
    reconcile.ts        — buildGroups()/evalGroup(): the three-way-match logic, groups docs by PO ref
    buildNetwork.ts     — turns ReconGroup[] into {nodes, links} for NetworkGraph (Linkage view)
    format.ts           — money(), k() (compact $ for risk figures), fsize()
    dropFiles.ts        — recursive folder-drop handling (webkitGetAsEntry directory walk)
    slides.tsx          — all 15 pitch-deck slides as data + render fns

  components/
    Sidebar.tsx          — nav + bottom-pinned "engine" card (shows active LLM model name)
    Header.tsx           — breadcrumb, LIVE dot, RESET button
    DataLake.tsx         — dropzone (file+folder), stats, filter chips, doc tile grid
    DocDrawer.tsx        — document detail panel: type/confidence/reasoning/signals/fields/excerpt + its TrailGraph
    Reconciliation.tsx   — exception/matched cards, each expandable to show TrailGraph + (if exception) detail
    TrailGraph.tsx       — small 3-node circular PO→GRN→Invoice diagram, used in Reconciliation cards + drawer
    NetworkGraph.tsx     — generic force-directed graph (d3-force), draggable/zoomable/pannable, used by Linkage
    Linkage.tsx          — full-batch network view, wraps NetworkGraph + buildNetwork
    Insights.tsx         — KPI tiles, two bar charts, action queue
    Architecture.tsx     — static SVG pipeline diagram (Intake→Classify→Extract→Reconcile→Insights) + Ollama callout
    Pitch.tsx            — slide viewer: scales 1920×1080 slides to fit, prev/next, keyboard arrows, slide index strip

  App.tsx                — the one stateful container: docs[], view, ingestRunning, reconcile state, etc.
```

## State model (lives entirely in `App.tsx`)

- `docs: TessDoc[]` — every doc, regardless of view. `File` objects are kept OUTSIDE React state in `filesRef` (a `Map<id, File>`), keyed by the same numeric id as `TessDoc.id` — don't put `File` objects in state.
- `ingestRunning` / `stopRequestedRef` — the classify loop (`runIngest`) checks `stopRequestedRef` before each doc and breaks cleanly; the in-flight doc finishes, remaining stay `queued` so you can resume.
- `reconcileRunning` / `reconcileIdx` / `reconcileDone` — reconciliation "resolves" one PO group every 300ms via `setInterval`, purely cosmetic pacing (the actual match computation in `buildGroups` is synchronous and instant).
- `filter`, `expanded`, `dragOver`, `selected` — UI-only state for Data Lake filter chips, the open Reconciliation card, dropzone hover, and the open DocDrawer doc id.
- **Nothing derived is stored** — stats, groups, KPIs, chart data are all recomputed from `docs` on render (mostly via `useMemo` wrapping `buildGroups`). If you add a feature, follow this pattern; don't cache derived state.

## The three-way match (`reconcile.ts`)

Groups all `done`, non-junk docs by normalized PO reference. Per group, status is decided in this order (first match wins): `duplicate` (>1 invoice) → `await_invoice` (PO, no invoice — not an exception) → `missing_po` (invoice, no PO) → `missing_grn` (PO+invoice, no GRN) → `short` (GRN qty < PO qty) → `price` (invoice > PO × 1.02) → `matched`. Exception statuses: `duplicate, missing_po, missing_grn, short, price` — these have non-zero `risk` and are expandable in the UI.

`ReconGroup` now carries an `all: TessDoc[]` field (the full doc list in that group, including customs docs) — added specifically so `buildNetwork.ts` could place customs nodes without re-deriving the grouping. If you add another doc type to the match, this is where it'd hook in.

## The graphs (this is the most recently-built, most-iterated part)

Two distinct graph components, intentionally sharing a visual language (circular nodes, type-colored strokes: PO emerald `#2fd08a`, GRN sky `#5dc6ff`, Invoice amber `#f5b942`, Customs violet `#b48cff`; coral `#f2685f` = flagged/broken):

1. **`TrailGraph.tsx`** — static, no physics. Always exactly 3 nodes (PO/GRN/Invoice) in a fixed row. Used in: Reconciliation card expand panel (now shown for ALL resolved groups, not just exceptions — matched groups show "all three documents agree"), and the DocDrawer (with the *current* doc's node given a thicker highlight ring via `highlightDocId`).

2. **`NetworkGraph.tsx`** — generic, reusable, force-directed via `d3-force`. Takes plain `{nodes, links}` (see `GraphNode`/`GraphLink` interfaces exported from that file) and:
   - Runs `forceSimulation` with `forceLink` + `forceManyBody` + `forceX`/`forceY` (weak centering, not `forceCenter` — that pulled the *centroid* to center, which let outlier clusters drift off-canvas) + `forceCollide`.
   - **Gotcha already hit and fixed**: `forceLink` mutates the link objects' `source`/`target` from id strings into direct node-object references the first time it runs. If you read `simNodes`/your own `links` prop by id after that, lookups silently miss and edges vanish. Fix in place: a `linksRef` holds the *same mutated link objects* d3 is operating on, and rendering reads `l.source.x`/`l.target.x` directly off them (after checking `typeof === 'object'`) rather than re-resolving by id.
   - Manual drag (pointer-capture, sets `fx`/`fy` on the dragged node) and manual wheel-zoom/pan (no `d3-zoom`/`d3-drag` dependency — deliberately dropped those packages after installing them, to avoid wiring d3's event model through React refs for marginal benefit at this graph size).
   - Tick handler clamps node x/y into the visible canvas (`PAD = 50`) so high-degree clusters can't fling outlier nodes off-screen.
   - `onNodeClick` prop — Linkage wires this straight to `setSelected` in `App.tsx`, so clicking a node in the network graph opens that document's detail drawer. Node `id` is the `TessDoc.id` as a string.

   `buildNetwork.ts` is the adapter: takes `ReconGroup[]` → emits one node per real document (po/grn/invoice/customs) and edges from PO to each linked doc, colored coral when that leg is the exception. Missing-PO invoices deliberately get **no edge** (isolation in the graph *is* the signal, matches "no matching PO" visually).

   **Testing gotcha**: the browse skill's `viewport --scale` rebuilds the browser context and resets all app state (it's a fresh page load). Don't combine viewport-scale changes with multi-step flows (load sample → ingest → reconcile → navigate) in one test session — do the scale-zero screenshot separately, or reload and redo the flow after changing scale. Also: the accessibility-tree snapshot used by the browse skill doesn't pick up SVG `<g>`/`<circle>` nodes, so testing node-click required dispatching a raw `MouseEvent('click', {bubbles:true})` via `js` eval rather than clicking an `@e`/`@c` ref.

## Known gaps / things NOT done (candidates for next steps)

- **No tests.** Everything has been verified by hand via the `browse` skill (screenshot + console-check), not automated. If continuing seriously, this is the biggest gap — at minimum unit-test `reconcile.ts` (the match logic) and `classify.ts`'s `heuristicClassify`/`parseJson`.
- **No backend/proxy for Ollama.** README documents the `OLLAMA_ORIGINS='*'` workaround; the "optional hardening" same-origin proxy mentioned in the original spec (`../README.md` §8.4) was never built.
- **No OCR.** Image files return empty text by design (per spec) — the drawer shows "No extractable text — OCR not available in this build." for those.
- **Pitch deck is static content**, not editable in-app — it's a faithful rebuild of the reference HTML's 15 slides as React/JSX, not a deck editor.
- **Architecture page is illustrative**, not derived from live app state (it's a fixed SVG diagram, doesn't reflect the actual configured model name beyond what's already shown in the sidebar).
- **Bundle size warning** on build (`pdf.worker` chunk + main bundle >500kB) — not addressed; would need `dynamic import()` / manual chunking if this becomes a real concern.
- **NetworkGraph performance** untested past ~30 nodes (the sample set). If someone loads thousands of real documents, the per-tick `simNodes` array clone (`setSimNodes([...sim.nodes()])`) and `O(n)` `.find()` calls in drag handlers will need attention (swap to a `Map` keyed by id).

## Design tokens reference (`src/index.css`)

```
--color-bg: #0b1410        --color-emerald: #2fd08a     --color-amber: #f5b942
--color-sidebar: #0e1712   --color-emerald-deep: #2c6b52 --color-coral: #f2685f
--color-surface: #122019   --color-emerald-ink: #06140e --color-idle-dot: #3a4a42
--color-raised: #16291f    --color-outline-tile: #2c4a3c
--color-cell: #101b15
--color-text / text-2 / text-3 / text-soft: #eaf2ee / #9fb3a9 / #6f8a7e / #cdddd4
```
Fonts loaded via Google Fonts `<link>` in `index.html`: Schibsted Grotesk (sans), JetBrains Mono (mono). Graph-specific colors (GRN sky `#5dc6ff`, Customs violet `#b48cff`) are NOT in the token system — they're data-viz colors local to `buildNetwork.ts`/`TrailGraph.tsx`, kept separate from the brand palette deliberately.

## If Gemini's first task is unclear

Good next steps, roughly in order of value: (1) add tests for `reconcile.ts`, (2) wire the optional Ollama proxy route to remove the CORS requirement, (3) handle >50-doc network graphs gracefully, (4) revisit bundle splitting. Don't re-derive state into new stored fields — everything follows the "derive on render from `docs`" pattern established throughout; breaking that will cause subtle bugs (stale stats, etc.) the next person won't expect.
