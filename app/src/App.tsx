import { useEffect, useRef, useState } from 'react';
import type { TessDoc, View, PolicyConfig } from './lib/types';
import { buildSample } from './lib/sample';
import { extractText } from './lib/extractText';
import { explain, llmEndpoint, llmModel } from './lib/classify';
import { runPipeline, runWithConcurrency, pipelineConcurrency } from './lib/agents/pipeline';
import { buildGroups } from './lib/reconcile';
import { fsize } from './lib/format';
import { buildMockPreview, isImageFile, isPdfFile } from './lib/preview';
import { loadPolicyConfig, runPolicyCheck, savePolicyConfig } from './lib/policy';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DataLake from './components/DataLake';
import DocDrawer from './components/DocDrawer';
import Reconciliation from './components/Reconciliation';
import Insights from './components/Insights';
import Architecture from './components/Architecture';
import Pitch from './components/Pitch';
import Linkage from './components/Linkage';

let nextId = 1;

export default function App() {
  const [view, setView] = useState<View>('lake');
  const [docs, setDocs] = useState<TessDoc[]>([]);
  const [ingestRunning, setIngestRunning] = useState(false);
  const [reconcileRunning, setReconcileRunning] = useState(false);
  const [reconcileIdx, setReconcileIdx] = useState(0);
  const [reconcileDone, setReconcileDone] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [llmWarning, setLlmWarning] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(llmModel());
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('tessera_theme') || 'dark');
  const [reviewThreshold, setReviewThreshold] = useState<number>(() => Number(localStorage.getItem('tessera_review_threshold') || 0.85));
  const [policyConfig, setPolicyConfig] = useState<PolicyConfig>(() => loadPolicyConfig());

  function handlePolicyConfigChange(cfg: PolicyConfig) {
    setPolicyConfig(cfg);
    savePolicyConfig(cfg);
    // Re-run policy check on all done docs
    setDocs((ds) => ds.map((d) =>
      d.status === 'done' ? { ...d, policyFlags: runPolicyCheck(d, ds, cfg) } : d
    ));
  }

  function handleReviewThresholdChange(v: number) {
    setReviewThreshold(v);
    localStorage.setItem('tessera_review_threshold', String(v));
    // Re-flag existing done docs with new threshold
    setDocs((ds) => ds.map((d) =>
      d.status === 'done' && !d.isJunk
        ? { ...d, needsReview: (d.confidence || 0) < v }
        : d
    ));
  }

  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'dark') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', theme);
    localStorage.setItem('tessera_theme', theme);
  }, [theme]);

  const filesRef = useRef<Map<number, File>>(new Map());
  const runningRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const reconTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const recRunningRef = useRef(false);
  const docsRef = useRef<TessDoc[]>(docs);
  docsRef.current = docs;

  useEffect(() => () => clearInterval(reconTimerRef.current), []);

  // Seed the lake with a handful of already-classified docs so it isn't a blank
  // dropzone — independent of the explicit "Load sample set" action. Re-run after reset.
  function seedDocs(): TessDoc[] {
    const seed = buildSample().slice(0, 8);
    const built: TessDoc[] = seed.map((d) => {
      const isJunk = d.type === 'junk';
      const pipelineLog = d.scanned
        ? [{ agent: 'ocr', outcome: 'used' as const, durationMs: 240, detail: 'phone-photographed scan, Tesseract enriched text' },
           { agent: 'sample', outcome: 'used' as const, durationMs: 0, detail: 'baked demo data, bypassed pipeline' }]
        : [{ agent: 'sample', outcome: 'used' as const, durationMs: 0, detail: 'baked demo data, bypassed pipeline' }];
      return {
        id: nextId++, name: d.name, source: d.source, synthetic: true,
        status: 'done' as const, type: d.type, confidence: d.conf, fields: d.fields,
        isJunk, needsReview: !isJunk && d.conf < reviewThreshold, pipelineLog,
        previewUrl: buildMockPreview(d.name, d.type, d.fields, isJunk),
      };
    });
    const cfg = loadPolicyConfig();
    return built.map((d) => ({ ...d, policyFlags: runPolicyCheck(d, built, cfg) }));
  }

  useEffect(() => {
    setDocs(seedDocs());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const model = llmModel();
    const base = (llmEndpoint().match(/^(https?:\/\/[^/]+)/) || [])[1] || 'http://localhost:11434';
    fetch(base + '/api/tags', { signal: AbortSignal.timeout(3000) })
      .then((r) => r.json())
      .then((data) => {
        const names: string[] = (data?.models || []).map((m: { name: string }) => m.name);
        setAvailableModels(names);
        const found = names.some((n) => n === model || n.startsWith(model + ':'));
        if (!found && names.length > 0) {
          setLlmWarning(`Model "${model}" not found in Ollama. Available: ${names.slice(0, 3).join(', ')}.`);
        } else {
          setLlmWarning(null);
        }
      })
      .catch(() => { /* Ollama offline — no warning needed */ });
  }, []);

  function updateDoc(id: number, patch: Partial<TessDoc>) {
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function addFiles(fileList: FileList | File[] | null) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const add: TessDoc[] = files.map((f) => {
      const id = nextId++;
      filesRef.current.set(id, f);
      const ext = (f.name.split('.').pop() || 'file').toLowerCase();
      const previewable = isImageFile(f.name) || isPdfFile(f.name);
      return {
        id, name: f.name, source: `${ext} · ${fsize(f.size)}`, synthetic: false, status: 'queued',
        type: null, confidence: 0, fields: {}, isJunk: false, needsReview: false,
        previewUrl: previewable ? URL.createObjectURL(f) : undefined,
        previewIsRealFile: previewable,
      };
    });
    setDocs((ds) => [...ds, ...add]);
    setReconcileDone(false); setReconcileIdx(0); setExpanded(null);
  }

  function onLoadSample() {
    const add: TessDoc[] = buildSample().map((d) => ({
      id: nextId++, name: d.name, source: d.source, synthetic: true, sampleType: d.type, sampleConf: d.conf, sampleFields: d.fields, sampleScanned: d.scanned,
      status: 'queued', type: null, confidence: 0, fields: {}, isJunk: false, needsReview: false,
      previewUrl: buildMockPreview(d.name, d.type, d.fields, d.type === 'junk'),
    }));
    setDocs((ds) => [...ds, ...add]);
    setReconcileDone(false); setReconcileIdx(0); setExpanded(null);
  }

  async function runIngest() {
    if (runningRef.current) return;
    runningRef.current = true;
    stopRequestedRef.current = false;
    setIngestRunning(true);
    const queue = docsRef.current.filter((d) => d.status === 'queued');

    await runWithConcurrency(
      queue,
      pipelineConcurrency(),
      async (doc) => {
        updateDoc(doc.id, { status: 'classifying' });
        let res, excerpt = '', pipelineLog;
        try {
          if (doc.synthetic) {
            await new Promise((r) => setTimeout(r, 150));
            res = { type: doc.sampleType!, confidence: doc.sampleConf!, fields: doc.sampleFields! };
            pipelineLog = [{ agent: 'sample', outcome: 'used' as const, durationMs: 0, detail: 'baked demo data, bypassed pipeline' }];
            if (doc.sampleScanned) {
              pipelineLog.unshift({ agent: 'ocr', outcome: 'used' as const, durationMs: 240, detail: 'phone-photographed scan, Tesseract enriched text' });
            }
          } else {
            const file = filesRef.current.get(doc.id);
            const text = file ? await extractText(file) : '';
            const piped = await runPipeline(doc.name, text, file);
            res = piped.result;
            pipelineLog = piped.log;
            // Use post-pipeline text for excerpt — OCR agent may have enriched it
            const finalText = piped.enrichedText ?? text;
            excerpt = (finalText || '').replace(/\s+/g, ' ').trim().slice(0, 700);
          }
        } catch {
          res = { type: 'junk' as const, confidence: 0.4, fields: { summary: 'Could not read file' } };
        }
        const isJunk = res.type === 'junk';
        const needsReview = !isJunk && (res.confidence || 0) < reviewThreshold;
        let reasoning = 'reasoning' in res ? res.reasoning : undefined;
        let signals = 'signals' in res ? res.signals : undefined;
        if (!reasoning || !signals || !signals.length) {
          const ex = explain(res.type, res.fields || {}, doc.name);
          reasoning = reasoning || ex.reasoning;
          signals = signals && signals.length ? signals : ex.signals;
        }
        const previewUrl = doc.previewIsRealFile ? doc.previewUrl : buildMockPreview(doc.name, res.type, res.fields || {}, isJunk);
        const updatedDoc: Partial<TessDoc> = {
          status: 'done', type: res.type, confidence: res.confidence, fields: res.fields || {},
          isJunk, needsReview, reasoning: reasoning ?? undefined, signals: signals ?? undefined, excerpt, pipelineLog, previewUrl,
        };
        // Run policy check against current docs snapshot + this doc's final fields
        const currentDocs = docsRef.current.map((d) => d.id === doc.id ? { ...d, ...updatedDoc } : d);
        updatedDoc.policyFlags = runPolicyCheck({ ...doc, ...updatedDoc } as TessDoc, currentDocs, policyConfig);
        updateDoc(doc.id, updatedDoc);
      },
      undefined,
      () => !stopRequestedRef.current,
    );

    runningRef.current = false;
    stopRequestedRef.current = false;
    setIngestRunning(false);
  }

  function stopIngest() {
    stopRequestedRef.current = true;
  }

  function runReconcile() {
    if (recRunningRef.current) return;
    const groups = buildGroups(docsRef.current);
    if (!groups.length) return;
    recRunningRef.current = true;
    setReconcileRunning(true);
    setReconcileIdx(0);
    setReconcileDone(false);
    reconTimerRef.current = setInterval(() => {
      setReconcileIdx((n) => {
        const next = n + 1;
        if (next >= groups.length) {
          clearInterval(reconTimerRef.current);
          recRunningRef.current = false;
          setReconcileRunning(false);
          setReconcileDone(true);
          return groups.length;
        }
        return next;
      });
    }, 300);
  }

  function reset() {
    clearInterval(reconTimerRef.current);
    runningRef.current = false;
    stopRequestedRef.current = false;
    recRunningRef.current = false;
    filesRef.current = new Map();
    nextId = 1;
    setView('lake'); setDocs(seedDocs()); setIngestRunning(false); setReconcileRunning(false);
    setReconcileIdx(0); setReconcileDone(false); setFilter('all'); setExpanded(null); setDragOver(false); setSelected(null);
  }

  function handleModelChange(name: string) {
    try { localStorage.setItem('tessera_llm_model', name); } catch { /* ignore */ }
    setSelectedModel(name);
    // re-validate: is the newly selected model in the known list?
    const found = availableModels.some((n) => n === name || n.startsWith(name + ':'));
    setLlmWarning(found || availableModels.length === 0 ? null : `Model "${name}" not found in Ollama.`);
  }

  const queued = docs.filter((d) => d.status === 'queued').length;
  const doneCount = docs.filter((d) => d.status === 'done').length;
  const lakeDone = doneCount > 0 && queued === 0 && !ingestRunning;
  const selectedDoc = selected != null ? docs.find((d) => d.id === selected) ?? null : null;

  return (
    <div className="w-screen h-screen flex bg-bg text-text overflow-hidden" style={{ fontFamily: 'var(--font-sans)' }}>
      <Sidebar
        view={view} lakeDone={lakeDone} reconcileDone={reconcileDone}
        llmName={selectedModel} llmWarning={llmWarning}
        availableModels={availableModels} onModelChange={handleModelChange}
        onSetView={setView}
        theme={theme} onThemeChange={setTheme}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <Header view={view} onReset={reset} reviewThreshold={reviewThreshold} onReviewThresholdChange={handleReviewThresholdChange} policyConfig={policyConfig} onPolicyConfigChange={handlePolicyConfigChange} />
        <div className="flex-1 overflow-y-auto p-[34px_40px_60px]">
          {view === 'lake' && (
            <DataLake
              docs={docs}
              ingestRunning={ingestRunning}
              filter={filter}
              dragOver={dragOver}
              onAddFiles={addFiles}
              onLoadSample={onLoadSample}
              onRunIngest={runIngest}
              onStopIngest={stopIngest}
              onSetFilter={setFilter}
              onSetDragOver={setDragOver}
              onSelectDoc={setSelected}
            />
          )}
          {view === 'recon' && (
            <Reconciliation
              docs={docs}
              reconcileRunning={reconcileRunning}
              reconcileIdx={reconcileIdx}
              reconcileDone={reconcileDone}
              expanded={expanded}
              onRunReconcile={runReconcile}
              onToggleExpand={(key) => setExpanded((e) => (e === key ? null : key))}
              onGoTo={setView}
            />
          )}
          {view === 'linkage' && <Linkage docs={docs} onGoTo={setView} onSelectDoc={setSelected} />}
          {view === 'insights' && <Insights docs={docs} reconcileDone={reconcileDone} onGoTo={setView} />}
          {view === 'architecture' && <Architecture docs={docs} selectedModel={selectedModel} />}
          {view === 'pitch' && <Pitch onOpenConsole={() => setView('lake')} />}
        </div>
      </main>
      {selectedDoc && <DocDrawer doc={selectedDoc} docs={docs} onClose={() => setSelected(null)} onUpdateDoc={updateDoc} />}
    </div>
  );
}
