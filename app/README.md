# Tessera Console

A document-intelligence console for purchase-order / invoice / goods-received management. Classifies any dropped document with a **local LLM (Gemma via Ollama, no API keys)**, runs a three-way match (PO → GRN → invoice), and surfaces exceptions and value-at-risk insights.

> **Picking this up from someone else / handing it off?** Read **[HANDOFF.md](./HANDOFF.md)** first — it documents the current state, file map, state model, and known gotchas in detail. This README only covers run instructions and a feature summary.

## Run it

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL (must be `http://localhost`, not `file://`, for both Ollama CORS and PDF text extraction to work).

## Enable the local LLM (optional but recommended)

The app works without this — it falls back to a keyword classifier — but for real classification:

```bash
# install Ollama: https://ollama.com
ollama pull gemma3
OLLAMA_ORIGINS='*' ollama serve
```

> **MacBook Air M4 (passively cooled)?** Use `gemma3:2b` or `qwen2.5:3b` instead of `gemma3` — they're fast enough for demo use and won't thermal-throttle the machine under Zoom load:
> ```bash
> ollama pull gemma3:2b   # or: ollama pull qwen2.5:3b
> ```
> Then select the model from the **LOCAL MODEL** dropdown in the app sidebar.

`OLLAMA_ORIGINS='*'` is required because Ollama rejects cross-origin browser requests by default.

By default the app calls `http://localhost:11434/api/generate` with model `gemma3`. **If you already have a different model pulled** (run `ollama list` to check), point the app at it instead of pulling `gemma3` — in the browser console:

```js
localStorage.setItem('tessera_llm_endpoint', 'http://localhost:1234/v1/chat/completions'); // e.g. LM Studio
localStorage.setItem('tessera_llm_model', 'gemma2'); // or whatever `ollama list` shows
```

then reload. The sidebar **ENGINE** card shows which model name is active.

If the model name doesn't match what Ollama has, every classify call gets `{"error":"model '...' not found"}`, the request throws, and ingestion **silently falls back to the keyword classifier** with no UI indication — only a `[Tessera] local model unreachable...` warning in the browser console. Always check the console if classifications look off. A live demo always works regardless via **LOAD SAMPLE SET**, which uses deterministic baked data and never calls the LLM.

## What's implemented

- **Data lake** — drag/drop (files or whole folders) or browse to pick files/a folder, or load the 32-document baked sample set. PDF text extracted client-side via `pdfjs-dist`, plain-text formats read directly. **Run classification** to classify + extract fields, with a **Stop** control to halt mid-run.
- **Document detail drawer** — click any classified tile to see its type, confidence, the model's reasoning, detected signals, all extracted fields, a text excerpt, and a circular PO→GRN→Invoice **trail graph** showing how it links to its reconciliation group.
- **Reconciliation** — three-way match grouped by PO reference, with five exception types (duplicate, missing PO, missing GRN, short delivery, price variance). Every group (matched or exception) expands to show its trail graph; exceptions additionally show a real-numbers explanation, recommended action, value at risk, and evidence filenames.
- **Linkage** — a full-batch, force-directed network graph (drag/zoom/pan, click a node to open its detail drawer) showing every document in the batch as a node, type-colored (PO/GRN/Invoice/Customs), with exception legs highlighted coral.
- **Insights** — KPIs, value-at-risk-by-exception-type and document-mix bar charts, and an action queue prioritised by risk.
- **Architecture** — a static diagram explaining the ingest → classify → extract → reconcile → insight pipeline and the local-only/no-backend story.
- **Pitch deck** — the 15-slide sales deck rebuilt in-app as a slide viewer (prev/next, keyboard arrows, slide index), with a working "Open the Tessera Console" CTA that jumps to Data Lake.

All design tokens, copy, and core logic (extraction, classification prompt/schema, keyword fallback, three-way-match rules) are ported from `../reference/Tessera Console.dc.html` and `../reference/Tessera Pitch.dc.html` per the project handoff spec in `../README.md`. See **[HANDOFF.md](./HANDOFF.md)** for everything built since.

## Build

```bash
npm run build
```
