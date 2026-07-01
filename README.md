# Tessera — Purchase Order & Invoice Management

> **Read this first.** The files in `reference/` are **design + behavior references built in HTML** — working prototypes that show the intended look, data model, and logic. They are **not** the production code to ship. Your job is to **recreate this app in a real codebase** (recommended: Vite + React + TypeScript + Tailwind) using the architecture and exact values documented here. The prototype's classification engine already calls a **local LLM (Gemma via Ollama)** with no API keys — preserve that.

---

## 1. Overview

**Tessera** is a document-intelligence console for procurement & finance teams at a large multinational. Brand line: **"Order from the data lake."**

It solves a specific problem: a company has tens of thousands of mixed documents (purchase orders, invoices, goods-received notes, customs declarations — plus junk like spam and out-of-office emails) dumped daily into an unstructured "data lake." Tessera **ingests** any file, **classifies & extracts** it with a local AI model, **reconciles** the procurement lifecycle via a three-way match, and surfaces **actionable insights**. The whole product thesis is **"structure first"**: understand every document on arrival, link the lifecycle (PO → Goods Received → Invoice), and reconcile continuously so discrepancies are caught *before* payment.

It must run entirely on **public/sample data** with **no access to any customer system**, and (in the local deployment) **files never leave the browser** except the extracted text, which goes only to the user's own localhost LLM.

There are two artifacts in this project:
- **The Console** (`Tessera Console.dc.html`) — the interactive app. **This is what to build.**
- **The Pitch deck** (`Tessera Pitch.dc.html`) — a 15-slide sales narrative. Optional to rebuild; treat as supporting collateral. Spec in §11.

## 2. Fidelity

**High-fidelity.** Colors, typography, spacing, copy, and interactions are final. Recreate the Console pixel-accurately using the exact design tokens in §9. The logic (classification schema, three-way-match rules, value-at-risk math) is also final and specified exactly in §6–§7 — implement it as written.

## 3. Recommended stack

No codebase exists yet, so pick a clean one:
- **Vite + React 18 + TypeScript**
- **Tailwind CSS** (map the tokens in §9 into `tailwind.config` theme extension) — or CSS modules; either is fine, but keep styling values exact.
- **pdfjs-dist** for client-side PDF text extraction.
- **Recharts** or hand-rolled CSS bars for the two Insights charts (the prototype uses simple CSS-width bars — that's perfectly acceptable).
- No state library needed; React `useState`/`useReducer` in one container component mirrors the prototype. If you prefer, lift to Zustand.
- **No backend required.** Classification calls the user's local Ollama directly from the browser. (Optionally add a thin proxy — see §8.4.)

## 4. App shell & navigation

Single-page console. Persistent **left sidebar (252px)** + **main column**.

- **Sidebar** (`bg #0e1712`, right border `rgba(255,255,255,0.06)`, padding 24px 18px):
  - **Logo lockup** (top): the Tessera mark + wordmark. Mark = a **2×2 grid of 9px tiles, 3px gap**, diagonal tiles filled `#2fd08a`, the other two outlined `1px solid #2c4a3c`. Wordmark "Tessera" 19px/600. Small mono pill "CONSOLE" (10px, letter-spacing .12em, color `#6f8a7e`, 1px border, radius 4px).
  - **Nav items** (3): **Data lake**, **Reconciliation**, **Insights**. Each: row 11px 13px padding, radius 9px; active row `bg #16291f`; leading 7px dot (`#2fd08a` active / `#3a4a42` idle); label 15px (active 600/`#eaf2ee`, idle 500/`#9fb3a9`); a trailing emerald ✓ appears once that stage is complete (lake ✓ after ingestion; recon & insights ✓ after reconciliation).
  - **Engine card** (bottom, `margin-top:auto`): box `bg #122019`, 1px border, radius 10px, padding 14px. Mono label "ENGINE" (10px, `#6f8a7e`). Body text shows the active model, e.g. **"Local model · gemma3 (Ollama) · keyword fallback if offline"**. Footer row: 7px emerald dot + "files stay in-browser" (mono 11px).
- **Header** (height 62px, bottom border `rgba(255,255,255,0.06)`, padding 0 30px, space-between):
  - Left breadcrumb (mono 13px): `tessera / <view>` where view ∈ `data-lake | reconciliation | insights`.
  - Right: a **LIVE** status (8px emerald dot with `box-shadow:0 0 0 4px rgba(47,208,138,0.15)` halo + mono "LIVE") and a **RESET** button (transparent, 1px border `rgba(255,255,255,0.14)`, mono 12px, `#9fb3a9`).
- **Main content** scrolls vertically; padding `34px 40px 60px`.

`view` state switches between the three screens (§5). `RESET` clears all state back to the empty Data lake.

## 5. Screens

### 5.1 Data Lake (default view)

**Purpose:** load documents and run AI ingestion (classification + extraction).

**Header row:** H1 "Data lake" (34px/600, letter-spacing -.02em) + sub line (16px `#9fb3a9`) that is state-dependent:
- 0 docs → "Drop files or load the sample set to begin"
- staged, not ingested → "`N` documents staged — `Q` queued for ingestion"
- running → "Reading and classifying documents…"
- complete → "`N` documents classified by the engine"

A **RUN INGESTION** button sits at the right of this row once any docs are staged (see button states below).

**Dropzone** (always visible): a dashed-border panel (`1.5px dashed rgba(255,255,255,0.16)`, radius 16px, `bg #0e1712`, padding 40px 24px, centered column). On drag-over: border `rgba(47,208,138,0.8)`, bg `rgba(47,208,138,0.06)`. Contents: a 30px emerald downward glyph, "Drop documents to ingest" (19px/600), helper text ("PDF, TXT, CSV, EML, JSON, HTML — or anything. Each file is read, classified, and its fields extracted on arrival."), then two buttons:
- **BROWSE FILES** — primary (`bg #2fd08a`, text `#06140e`, mono 13px/500, radius 8px) → opens a hidden `<input type=file multiple>`.
- **LOAD SAMPLE SET** — secondary (transparent, 1px border `rgba(255,255,255,0.16)`, `#cdddd4`) → injects the ~30 baked sample docs (§6.4).

Accepts **any** file via drop or picker (`multiple`).

**After docs exist**, below the dropzone:
- **Stats row** (4 cards, grid): "documents in lake" (`N`, white), "routed to processing" (emerald), "quarantined as noise" (`#9fb3a9`), "flagged for review" (amber). Values show "—" until ingestion has produced results. Card = `bg #122019`, 1px border, radius 12px, padding 20px 22px; number is mono 30px/500; label 14px `#9fb3a9`.
- **Filter chips** (after ingestion): All, Purchase orders, Invoices, Goods receipts, Customs, Needs review, Quarantined — each shows a live count and only renders if count > 0 (except All). Selected chip: border `rgba(47,208,138,0.5)`, bg `rgba(47,208,138,0.1)`, text `#2fd08a`. Idle: 1px `rgba(255,255,255,0.1)` border, `#9fb3a9`. Mono 12px, padding 8px 13px, radius 7px.
- **Document grid** (`repeat(auto-fill, minmax(224px,1fr))`, gap 14px). Each **document tile** (`bg #122019`, radius 10px, padding 13px 14px, column, gap 6px):
  - Filename (mono 13px `#eaf2ee`, ellipsis).
  - Source line (mono 11px `#6f8a7e`) — e.g. "pdf · 42 KB" for uploads, or a feed name like "email-gateway" for samples.
  - Status row (min-height 22px):
    - queued → mono "queued" `#6f8a7e`
    - classifying → an 11px emerald **spinner** (border-top emerald, `animation: spin .7s linear infinite`) + "reading…" `#2fd08a`; whole tile pulses (`animation: pulse 1s ease infinite`) and border → `rgba(47,208,138,0.5)`.
    - done → a **type pill** + a meta label. Pill colors: junk → `bg rgba(255,255,255,0.05)`/`#6f8a7e` text "Quarantined"; needs-review (conf < .85, non-junk) → `bg rgba(245,185,66,0.14)`/`#f5b942`, meta "`NN`% · review", tile border `rgba(245,185,66,0.4)`; normal → `bg rgba(47,208,138,0.12)`/`#2fd08a`, meta "`NN`%". Junk tiles render at `opacity 0.55`.
  - **Extract line** (done, non-junk): a top-bordered footer (mono 11px `#9fb3a9`, ellipsis) summarizing extracted fields, e.g. "Rhein Components GmbH · €84,200".
  - **Tiles are clickable** → open the **Document Detail drawer** (§5.4). *(Note: in the current prototype the drawer's `onClick`/markup was the last pending piece — the data behind it, `reasoning`/`signals`/`excerpt`, is fully produced during ingestion and stored on each doc. Implement the drawer per §5.4.)*

**Button states** (shared mono style, 13px/500, radius 9px, padding 13px 22px):
- queued > 0, not running → "▶ RUN INGESTION (`Q`)" primary emerald.
- running → "CLASSIFYING `done` / `total`…" (`bg #16291f`/`#2fd08a`, non-interactive).
- all done → "✓ INGESTION COMPLETE" (`bg rgba(47,208,138,0.12)`/`#2fd08a`).

### 5.2 Reconciliation

**Purpose:** run the three-way match and surface exceptions.

If **no documents are ingested yet**, show an empty state (centered): square glyph tile, "Ingest some documents first", helper text, and a **GO TO DATA LAKE →** button.

When ready: H1 "Reconciliation" + sub "Three-way match · purchase order → goods received → invoice, grouped by PO reference", and a **RUN RECONCILIATION** button (states: idle primary / "MATCHING n / N…" / "✓ RECONCILIATION COMPLETE" which remains clickable to re-run).

**Summary row** (3 cards): "matched & cleared" (emerald), "exceptions flagged" (amber), "value at risk surfaced" (coral). "—" until reconciliation completes.

**Transaction cards** — one per PO group, **sorted exceptions-first then by value-at-risk desc**. During the run they resolve one-by-one (300ms interval; the active card pulses). Each card (`bg #122019`, radius 13px):
- **Header row** (clickable when it's an expandable exception): mono PO ref `#9fb3a9`, vendor 17px/600, country mono 12px `#6f8a7e`; right side = **status pill** + a chevron (rotates 90° when open). Pill: matched → `rgba(47,208,138,0.14)`/`#2fd08a` "✓ Matched"; exception → `rgba(245,185,66,0.16)`/`#f5b942` with the exception label; non-exception non-matched (e.g. awaiting) → neutral.
- **Three columns** (PO | Goods received | Invoice), 1px-gap grid on `bg #101b15`, each cell padding 16px 20px: a mono uppercase label, a 17px/500 main value, a mono 12px sub. **Flagged cells turn coral** (`#f2685f`) on both main + sub when that leg is the problem.
- **Expanded detail** (exceptions only): top border + `bg rgba(245,185,66,0.04)`, slide/rise animation. Left column: "WHAT WE FOUND" (mono amber label) + plain-language body with the real numbers; "RECOMMENDED ACTION" (mono emerald label) + body. Right column (260px): a **Value at risk** box (`bg #16291f`, 1px `rgba(242,104,95,0.3)` border, coral mono 26px amount) + an **EVIDENCE** list of the source filenames in that group (each row mono 12px `#9fb3a9` with an emerald □).

Card border by state: resolving `rgba(47,208,138,0.4)`; resolved exception `rgba(245,185,66,0.28)`; resolved matched `rgba(47,208,138,0.18)`.

### 5.3 Insights

**Purpose:** procurement/finance reporting from the reconciled set. Empty state (until reconciliation completes): triangle glyph, "Run reconciliation to unlock insights", **GO TO RECONCILIATION →**.

When ready: H1 "Insights" + sub.
- **KPI row** (6 tiles, mono 24px/500): documents ingested, routed to AP, quarantined, exceptions surfaced (amber if >0), value at risk (coral if >0), avg confidence (emerald). Card style as §5.1 stats but tighter (padding 18px).
- **Two chart cards** (grid `1.15fr 1fr`):
  - **"Value at risk by exception type"** — horizontal bars (coral `#f2685f`), one per exception type present, width ∝ value, sorted desc; mono label / bar / amount. If zero risk, show "No value at risk — everything reconciled cleanly."
  - **"Document mix"** — horizontal bars (`#2c6b52`, quarantined uses `#3a4a42`) for Invoice/PO/Goods receipt/Customs/Quarantined counts present.
- **Action queue card**: title + "prioritised by value at risk". Rows (border-top separated): coral mono impact amount (84px col), an amber exception **tag** chip (150px, centered), the recommended-action text (`#eaf2ee`, flex-1), and the vendor (`#9fb3a9`). Empty → "No open actions — all documents cleared."

### 5.4 Document Detail drawer  *(implement — see note in §5.1)*

Opens when a document tile is clicked; a right-side drawer/sheet (~420px) or modal over a scrim. Shows, for the selected doc:
- **Type** (large, color-coded as the pill) + **confidence** %.
- **Reasoning** — the model's one-sentence justification (`reasoning`).
- **Detected signals** — the `signals[]` array as a list of chips/rows (the concrete cues the model quoted from the text, e.g. "header reads 'TAX INVOICE'", "references PO-4471").
- **Extracted fields** — a clean key/value table of all non-null fields: vendor, country, currency, doc_id, po_reference, total_amount (money-formatted), quantity, summary.
- **Text excerpt** — first ~700 chars of the extracted text (`excerpt`), mono, in a scrollable box. For image/binary files with no text, show "No extractable text — OCR not available in this build."
- Close via ✕, scrim click, or Esc. Use the same dark surface tokens.

This is the feature the stakeholder specifically asked for: **"see the type of document and why it was classified that way."** All the data (`reasoning`, `signals`, `excerpt`, `fields`, `confidence`) is already produced and stored during ingestion (§6) — the drawer just presents it.

## 6. Ingestion pipeline (core logic — implement exactly)

Per document, in queue order (`status: queued → classifying → done`):

1. **Extract text** client-side (`extractText`):
   - `.txt/.csv/.tsv/.json/.eml/.html/.md/.xml/.log/.rtf/.yaml/.yml/.ini` → read as text, cap **8000 chars**.
   - `.pdf` → pdfjs-dist: load, read up to **6 pages**, join `textContent.items[].str`, cap 8000.
   - images (`png/jpg/jpeg/gif/webp/bmp/tiff/heic/svg`) → return "" (no OCR).
   - else → read as text; keep only if >70% printable chars.
   - Keep the first **700 chars** as `excerpt` for the detail drawer.
2. **Classify** (`classify`): call the **local LLM** (§8). On any error, **fall back** to the keyword classifier (§7) — the app must never dead-end.
3. Derive flags: `isJunk = type==='junk'`; `needsReview = !isJunk && confidence < 0.85`.
4. If the model didn't return `reasoning`/`signals`, synthesize them from the extracted fields (`explain()` — see prototype) so the drawer always has content.
5. Store on the doc: `type, confidence, fields, isJunk, needsReview, reasoning, signals[], excerpt`.

### 6.4 Sample set (~30 docs)
The "Load sample set" path injects pre-baked docs that flow through the **same UI** but skip the LLM (they carry their own `type`/`confidence`/`fields`). They exist so a live demo always has rich, deterministic data. The exact sample dataset is in `buildSample()` in the reference file — **copy it verbatim**. It is 8 PO "transactions" (`ref 4471–4478`) that expand into POs, GRNs, invoices (+ one duplicate), 4 customs decls, and 6 junk items, engineered to produce one of each exception type. Reproduce these 8 rows exactly (vendor, country, currency, amounts, qty, grn state, intended `result`):
- 4471 Rhein Components GmbH / DE / EUR 84,200 / qty 4000 / GRN full → **matched**
- 4472 Aurora Logistics / BR / BRL po 312,000 inv 343,200 / qty 600 / GRN full → **price variance**
- 4473 Bharat Steelworks / IN / USD 128,400 / ordered 4000 recv 3600 → **short delivery**
- 4474 Pacific Freight Co / SG / SGD 56,800 / qty 120 / GRN full / **duplicate** invoice → **duplicate**
- 4475 Continental Tooling / US / USD 73,500 / qty 300 / GRN missing → **missing GRN**
- 4476 Lyon Métaux SA / FR / EUR / no PO / inv 45,900 → **no matching PO**
- 4477 Rhein Components GmbH / DE / EUR 19,750 / qty 500 / GRN full → **matched**
- 4478 Andes Mining Supply / CL / USD 204,000 / qty 1500 / GRN full → **matched**

## 7. Reconciliation logic (implement exactly)

**Grouping:** take all `done`, non-junk docs. Key = normalized PO reference (uppercase, strip non-alphanumerics) — for POs use `poRef || docId`, for everything else use `poRef`. Docs with no key get a unique solo key.

**Per group** find the PO, the GRN(s), the invoice(s); derive currency/ref/vendor/country from the PO first, else the invoice. Then determine status (first match wins):
- `invs.length > 1` → **duplicate**; risk = invoice total.
- PO and no invoice → **await_invoice** (not an exception).
- invoice and no PO → **missing_po**; risk = invoice total.
- PO and invoice:
  - no GRN → **missing_grn**; risk = invoice total.
  - GRN qty < PO qty → **short**; risk = (PO total or inv total) × (1 − recv/ordered).
  - invoice total > PO total × 1.02 → **price**; risk = inv − PO.
  - else → **matched**.
- neither → **orphan**.

**Exception set** = {duplicate, missing_po, missing_grn, short, price} (these have a non-zero `risk` and are expandable). Totals: matched count, exception count, Σrisk. Money formatting: symbol by currency (`EUR €, GBP £, BRL R$, SGD S$, USD $`, …), rounded, thousands-separated; compact "$X.XK" for risk figures.

Exception copy (use the real numbers) and recommended actions are written out per type in the reference `renderVals()` — reuse that wording (e.g. price → "Hold the difference and dispute the overbilling against the agreed PO price before releasing payment.").

## 8. Local LLM integration (Gemma via Ollama) — **keep this; no API keys**

This is the part the user cares about most. Classification runs against a model on the user's **own machine**.

### 8.1 Defaults
- Endpoint: `http://localhost:11434/api/generate` (Ollama native).
- Model: `gemma3`.
- Both overridable at runtime via `localStorage`: `tessera_llm_endpoint`, `tessera_llm_model` (so users can point at `gemma2`, `gemma:2b`, etc., or an LM Studio endpoint, without editing code).

### 8.2 Request shape
Detect OpenAI-style endpoints (path ends in `/completions` or contains `/v1`) vs Ollama:
- **Ollama:** `POST {model, prompt, stream:false, format:"json", options:{temperature:0.1}}`; read `data.response`.
- **OpenAI-style (LM Studio):** `POST {model, messages:[{role:"user",content:prompt}], temperature:0.1, stream:false}`; read `data.choices[0].message.content`.
Parse the returned text as JSON defensively (strip ``` fences, slice from first `{` to last `}`).

### 8.3 Prompt & schema
System/user prompt instructs: *"You are a procurement document-intelligence engine… Classify ONE document and extract its key fields. Respond with ONLY a single minified JSON object."* Schema:
```json
{"type":"purchase_order|invoice|goods_receipt|customs|junk","confidence":0-1,
 "vendor":string|null,"country":string|null,"currency":"ISO4217"|null,
 "doc_id":string|null,"po_reference":string|null,"total_amount":number|null,
 "quantity":number|null,"summary":"max 12 words",
 "reasoning":"one sentence on why you chose this type",
 "signals":["a concrete phrase or cue you found","another cue"]}
```
Rules in the prompt: junk = non-procurement (spam/OOO/newsletter/photo/notice); goods_receipt = delivery note/GRN/packing list; `total_amount` plain number; **`signals` must quote real evidence from the text**; null for absent fields. Map `type` → internal codes `po/invoice/grn/customs/junk`. The full prompt string is in `modelClassify()` — reuse it.

### 8.4 The one gotcha — CORS
Ollama rejects cross-origin browser calls by default. The app must be **served over `http://localhost`** (not opened as a `file://`), and Ollama started with origins allowed:
```
OLLAMA_ORIGINS='*' ollama serve
```
Document this in your README. **Optional hardening:** add a tiny same-origin backend route (e.g. a Vite dev-server middleware or an Express `/api/classify`) that proxies to Ollama server-side — this removes the CORS requirement entirely and is the cleaner production pattern. Keep the localStorage overrides either way.

### 8.5 Engine status
Reflect the active model in the sidebar Engine card and surface a console warning on fallback ("local model unreachable — using keyword fallback"). Show whether you're on the live model or the keyword fallback.

## 7-bis. Keyword fallback (`heuristicClassify`)
A pure-JS classifier used when the LLM is unreachable: regex cues over filename+text decide the type (e.g. `/invoice|amount due|bill to|vat/` → invoice; `/out of office|unsubscribe|newsletter|verify your|^re:/` → junk; etc.), with simple regex field extraction (PO ref, invoice id, currency symbol, max "total/amount due" number, quantity). Confidences ~0.62–0.9. Copy this function verbatim from the reference so behavior matches when offline.

## 9. Design tokens (exact)

**Color**
| Token | Hex | Use |
|---|---|---|
| bg | `#0b1410` | app background |
| sidebar | `#0e1712` | sidebar + dropzone bg |
| surface | `#122019` | cards |
| raised | `#16291f` | active rows, risk box, running buttons |
| cell | `#101b15` | recon column cells |
| border | `rgba(255,255,255,0.07)` | card borders |
| border-soft | `rgba(255,255,255,0.06)` | header/sidebar dividers |
| text | `#eaf2ee` | primary |
| text-2 | `#9fb3a9` | secondary |
| text-3 | `#6f8a7e` | faint / mono labels |
| text-soft | `#cdddd4` | body on dark |
| **emerald** | `#2fd08a` | primary accent / matched / on-brand |
| emerald-deep | `#2c6b52` | mix bars |
| emerald-ink | `#06140e` | text on emerald buttons |
| outline-tile | `#2c4a3c` | logo outlined tiles |
| **amber** | `#f5b942` | review / exception |
| **coral** | `#f2685f` | high-risk / overbilling |
| idle-dot | `#3a4a42` | inactive nav dot |

**Type:** "Schibsted Grotesk" (UI/display, weights 400/500/600/700); "JetBrains Mono" (all data, IDs, money, uppercase tracked labels, weights 400/500/700). Load from Google Fonts. Scale: H1 34/600 (-.02em); section titles 18/600; tile main 17/500; body 15–16; mono labels 11–13 (uppercase ones letter-spacing .1–.22em). Numbers: mono 24–30/500, -.01em.

**Radius:** tiles 10, cards 12–14, buttons 7–9, dropzone 16, pills 5–6.
**Spacing:** content padding 34/40; card padding 18–24; grid gaps 14–16.
**Animations:** `spin .7s linear infinite` (reading spinner); `pulse 1s ease infinite` (classifying/resolving); `rise/slide .2s ease` (detail expand). Reconciliation resolves cards on a **300ms** interval.

## 10. State model

One container holds: `view` ('lake'|'recon'|'insights'), `docs[]` (each: id, name, source, synthetic?, status, type, confidence, fields{vendor,country,currency,docId,poRef,total,qty,summary}, isJunk, needsReview, reasoning, signals[], excerpt), `ingestRunning`, `reconcileRunning`, `reconcileIdx`, `reconcileDone`, `filter`, `expanded` (open recon group key), `dragOver`, `selected` (open doc id for the drawer). The actual `File` objects are held outside React state (a Map keyed by id) — don't put `File`s in state. Derive all stats/groups/charts from `docs` on render (see `renderVals`); don't duplicate derived data into state.

## 11. Pitch deck (optional, supporting)

`Tessera Pitch.dc.html` is a **15-slide 1920×1080 deck** using the same dark/emerald system (Schibsted Grotesk + JetBrains Mono). Narrative order: Cover → The situation → Four problems, one root cause → Why the last approach failed → The cost of chaos → Our thesis (structure first) → How Tessera works (5-stage pipeline) → The three-way match → Where we differ from the last vendor → **Live demo** (links to the Console) → Insights for procurement & finance → Built to scale → Trust before access → The rollout (phased) → What happens next. Rebuild only if you need the sales collateral in-app; otherwise keep as the reference HTML. Min on-slide font size 24px.

## 12. Files in this bundle

- `reference/Tessera Console.dc.html` — **the source of truth** for all Console logic: `extractText`, `classify`/`modelClassify` (local Gemma), `heuristicClassify` (fallback), `explain`, `buildSample`, `buildGroups`/`evalGroup` (three-way match), `renderVals` (all view models + exact copy), and the full template/markup with inline-styled tokens. Note: it's authored as a "Design Component" (a `<x-dc>` template + a `class Component` logic class) — **read it for the logic and values, don't port the DC runtime**; reimplement as idiomatic React.
- `reference/Tessera Pitch.dc.html` — the 15-slide deck (same note about DC format).
- `reference/tessera-console.standalone.html` — a fully self-contained build of the Console (runtime + pdf.js + fonts inlined). Useful to **run the prototype yourself** to see intended behavior: serve it over localhost (`python3 -m http.server`) and open in Chrome with Ollama running. Not for porting line-by-line.

## 13. Acceptance checklist

- [ ] Drag-drop or browse **any** file; PDFs and text files get real text extraction.
- [ ] **Run ingestion** classifies each doc via **local Gemma/Ollama** (no API keys), with keyword fallback when offline; tiles show type + confidence; junk quarantined; <85% flagged for review.
- [ ] **Clicking a doc opens the detail drawer** showing type, confidence, **reasoning**, **detected signals**, all extracted fields, and a text excerpt. *(the stakeholder's key ask)*
- [ ] **Load sample set** gives 3 matched + 5 exceptions, ~$220K at risk, deterministically.
- [ ] **Reconciliation** computes the three-way match from extracted fields; exceptions expand with real numbers, recommended action, value at risk, and evidence filenames.
- [ ] **Insights** KPIs + both charts + action queue all compute from live data.
- [ ] Exact tokens (§9), fonts, and copy; the dark emerald system reproduced faithfully.
- [ ] Served over `http://localhost`; Ollama launched with `OLLAMA_ORIGINS='*'`; model name configurable via `localStorage`.
