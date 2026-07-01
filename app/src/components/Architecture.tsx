import { useMemo } from 'react';
import type { TessDoc } from '../lib/types';

interface Props {
  docs?: TessDoc[];
  selectedModel?: string;
}

const STAGES = [
  { key: 'intake',    label: 'Intake',    sub: 'pdfjs + text read' },
  { key: 'triage',   label: 'Triage',    sub: 'filter' },
  { key: 'ocr',      label: 'OCR',       sub: 'enricher' },
  { key: 'extract',  label: 'Extract',   sub: 'llm agent' },
  { key: 'reconcile',label: 'Reconcile', sub: '3-way match' },
  { key: 'insights', label: 'Insights',  sub: 'kpis + chat' },
];

const BOX_W = 96, BOX_H = 72, GAP = 18, START_X = 22, BOX_Y = 110;
const CONTAINER = { x: 10, y: 58, w: 760, h: 166 };
const CLASSIFY = new Set(['triage', 'ocr', 'extract']);
function boxX(i: number) { return START_X + i * (BOX_W + GAP); }

// ── Icons (24×24 viewBox, used via transform to position) ─────────────────
function IconFunnel() {
  return <path d="M3 4h18l-7 8v7l-4-2V12L3 4z" fill="none" stroke="#6f8a7e" strokeWidth="1.5" strokeLinejoin="round" />;
}
function IconScan() {
  return <>
    <rect x="4" y="3" width="13" height="16" rx="2" fill="none" stroke="#6f8a7e" strokeWidth="1.5" />
    <line x1="7" y1="8"  x2="14" y2="8"  stroke="#6f8a7e" strokeWidth="1.2" />
    <line x1="7" y1="11" x2="14" y2="11" stroke="#6f8a7e" strokeWidth="1.2" />
    <line x1="7" y1="14" x2="11" y2="14" stroke="#6f8a7e" strokeWidth="1.2" />
    <line x1="19" y1="6" x2="19" y2="18" stroke="#2fd08a" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
  </>;
}
function IconAgent() {
  return <>
    <circle cx="12" cy="12" r="4" fill="none" stroke="#2fd08a" strokeWidth="1.5" />
    <line x1="12" y1="2"  x2="12" y2="6"  stroke="#2fd08a" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="12" y1="18" x2="12" y2="22" stroke="#2fd08a" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="2"  y1="12" x2="6"  y2="12" stroke="#2fd08a" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="18" y1="12" x2="22" y2="12" stroke="#2fd08a" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="4.9" y1="4.9" x2="7.8" y2="7.8" stroke="#2fd08a" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    <line x1="16.2" y1="16.2" x2="19.1" y2="19.1" stroke="#2fd08a" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
  </>;
}

interface PipelineStat { id: string; label: string; role: string; isAgent: boolean; used: number; deferred: number; avgMs: number | null; totalDocs: number; }

export default function Architecture({ docs = [], selectedModel = 'gemma3' }: Props) {
  const doneDocs = docs.filter((d) => d.status === 'done' && d.pipelineLog?.length);

  const stats = useMemo<PipelineStat[]>(() => {
    // Sample docs bypass the real pipeline — map them onto the stages they represent:
    // junk sample docs → triage filtered, non-junk sample docs → extractor classified.
    const sampleDocs = doneDocs.filter((d) => d.pipelineLog?.some((s) => s.agent === 'sample'));
    const syntheticTriage = sampleDocs.filter((d) => d.isJunk).length;
    const syntheticExtractor = sampleDocs.filter((d) => !d.isJunk).length;

    return [
      { id: 'triage',    label: 'Triage Filter',   role: 'Filter',    isAgent: false },
      { id: 'ocr',       label: 'OCR Enricher',    role: 'Enricher',  isAgent: false },
      { id: 'extractor', label: 'Deep Extractor',  role: 'LLM Agent', isAgent: true  },
    ].map((a) => {
      const steps = doneDocs.flatMap((d) => (d.pipelineLog || []).filter((s) => s.agent === a.id));
      let used = steps.filter((s) => s.outcome === 'used').length;
      const deferred = steps.filter((s) => s.outcome === 'deferred').length;
      const times = steps.map((s) => s.durationMs).filter((n) => n > 0);
      const avgMs = times.length ? Math.round(times.reduce((x, y) => x + y, 0) / times.length) : null;
      // Fold in synthetic counts for the demo dataset
      if (a.id === 'triage')    used += syntheticTriage;
      if (a.id === 'extractor') used += syntheticExtractor;
      return { ...a, used, deferred, avgMs, totalDocs: doneDocs.length };
    });
  }, [doneDocs]);

  const hasStats = doneDocs.length > 0;
  const triagePct  = stats[0].totalDocs > 0 ? Math.round((stats[0].used / (stats[0].used + stats[2].used || 1)) * 100) : 0;
  const ocrPct     = doneDocs.length > 0 ? Math.round((stats[1].used / doneDocs.length) * 100) : 0;
  const llmPct     = 100 - triagePct;

  const extractIdx = 3;
  const ollamaX = boxX(extractIdx) + BOX_W / 2 - 88;
  const modelLabel = selectedModel.length > 18 ? selectedModel.slice(0, 16) + '…' : selectedModel;

  // ── Classification pipeline infographic ─────────────────────────────────
  const PIPE_W = 800, PIPE_H = hasStats ? 230 : 180;
  const CARD_W = 220, CARD_H = hasStats ? 150 : 110, CARD_GAP = 40;
  const CARD_Y = 20;
  const cardX = (i: number) => 20 + i * (CARD_W + CARD_GAP);
  const ICON_CONFIGS = [
    { id: 'triage',    color: '#6f8a7e', bg: 'rgba(111,138,126,0.1)', border: 'rgba(111,138,126,0.25)', icon: 'funnel' },
    { id: 'ocr',       color: '#6f8a7e', bg: 'rgba(111,138,126,0.1)', border: 'rgba(111,138,126,0.25)', icon: 'scan' },
    { id: 'extractor', color: '#2fd08a', bg: 'rgba(47,208,138,0.1)',  border: 'rgba(47,208,138,0.4)',   icon: 'agent' },
  ];

  // ── TA flow diagram ─────────────────────────────────────────────────────
  const TA_NODES = [
    { label: 'Reconciled\nBatch', sub: `${doneDocs.length || '—'} docs · exceptions · vendors`, color: '#5dc6ff', bg: 'rgba(93,198,255,0.08)', border: 'rgba(93,198,255,0.3)' },
    { label: 'Context\nBuilder', sub: 'structured summary · deterministic', color: '#9fb3a9', bg: 'rgba(159,179,169,0.06)', border: 'rgba(159,179,169,0.2)' },
    { label: modelLabel, sub: 'llm agent · localhost', color: '#2fd08a', bg: 'rgba(47,208,138,0.08)', border: 'rgba(47,208,138,0.35)' },
    { label: 'Token\nStream', sub: 'streaming · word by word', color: '#f5b942', bg: 'rgba(245,185,66,0.07)', border: 'rgba(245,185,66,0.25)' },
    { label: 'Your\nAnswer', sub: 'AP analyst · insights page', color: '#2fd08a', bg: 'rgba(47,208,138,0.08)', border: 'rgba(47,208,138,0.25)' },
  ];
  const TN_W = 124, TN_H = 72, TN_GAP = 22;
  const TA_SVG_W = 5 * TN_W + 4 * TN_GAP + 40;
  const tnX = (i: number) => 20 + i * (TN_W + TN_GAP);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[34px] font-semibold tracking-[-0.02em] mb-[6px]">Architecture</h1>
        <p className="text-[16px] text-text-2">How a document moves through Tessera, end to end</p>
      </div>

      {/* ── Main pipeline diagram ── */}
      <div className="bg-surface border border-border-soft rounded-[14px] p-[28px_26px] mb-6">
        <svg viewBox="0 0 790 356" width="100%" style={{ display: 'block', maxWidth: 790 }}>
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#2fd08a" />
            </marker>
            <marker id="arr-f" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#6f8a7e" />
            </marker>
          </defs>
          <rect x={CONTAINER.x} y={CONTAINER.y} width={CONTAINER.w} height={CONTAINER.h} rx={14} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={1.5} strokeDasharray="5,5" />
          <text x={CONTAINER.x + 16} y={CONTAINER.y + 22} fontFamily="JetBrains Mono, monospace" fontSize="11" letterSpacing="0.14em" fill="#6f8a7e">YOUR BROWSER TAB</text>
          {/* classification bracket */}
          <rect x={boxX(1) - 8} y={BOX_Y - 12} width={3 * BOX_W + 2 * GAP + 16} height={BOX_H + 24} rx={8} fill="rgba(47,208,138,0.04)" stroke="rgba(47,208,138,0.22)" strokeWidth={1} strokeDasharray="3,3" />
          <text x={boxX(1) + (3 * BOX_W + 2 * GAP) / 2} y={BOX_Y - 17} fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="0.12em" fill="#2fd08a" textAnchor="middle">CLASSIFICATION PIPELINE</text>
          {STAGES.map((s, i) => {
            const x = boxX(i);
            const inClass = CLASSIFY.has(s.key);
            return (
              <g key={s.key}>
                <rect x={x} y={BOX_Y} width={BOX_W} height={BOX_H} rx={10} fill="#16291f" stroke={inClass ? 'rgba(47,208,138,0.45)' : 'rgba(255,255,255,0.1)'} strokeWidth={1.5} />
                <text x={x + BOX_W / 2} y={BOX_Y + 18} fontFamily="JetBrains Mono, monospace" fontSize="10" letterSpacing="0.06em" fill="#6f8a7e" textAnchor="middle">{String(i + 1).padStart(2, '0')}</text>
                <text x={x + BOX_W / 2} y={BOX_Y + BOX_H / 2 + 7} fontFamily="Schibsted Grotesk, sans-serif" fontSize="14" fontWeight={600} fill="#eaf2ee" textAnchor="middle">{s.label}</text>
                <text x={x + BOX_W / 2} y={BOX_Y + BOX_H - 8} fontFamily="JetBrains Mono, monospace" fontSize="9" fill={s.key === 'extract' ? '#2fd08a' : '#6f8a7e'} textAnchor="middle" opacity="0.8">{s.sub}</text>
                {i < STAGES.length - 1 && <line x1={x + BOX_W + 3} y1={BOX_Y + BOX_H / 2} x2={x + BOX_W + GAP - 3} y2={BOX_Y + BOX_H / 2} stroke="#2fd08a" strokeWidth={1.5} markerEnd="url(#arr)" />}
              </g>
            );
          })}
          <line x1={boxX(extractIdx) + BOX_W / 2} y1={BOX_Y + BOX_H + 4} x2={boxX(extractIdx) + BOX_W / 2} y2={274} stroke="#6f8a7e" strokeWidth={1.5} strokeDasharray="4,4" markerEnd="url(#arr-f)" markerStart="url(#arr-f)" />
          <rect x={ollamaX} y={278} width={176} height={62} rx={10} fill="#101b15" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
          <text x={ollamaX + 88} y={302} fontFamily="JetBrains Mono, monospace" fontSize="10" letterSpacing="0.08em" fill="#9fb3a9" textAnchor="middle">OLLAMA · LOCALHOST</text>
          <text x={ollamaX + 88} y={320} fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#6f8a7e" textAnchor="middle">{modelLabel} · :11434</text>
        </svg>
        <div className="font-mono text-[12px] text-text-3 mt-3 pt-3 border-t border-border-soft">
          No backend · no database · no API keys. Everything in the dashed box runs in this browser tab.
        </div>
      </div>

      {/* ── Classification pipeline infographic ── */}
      <div className="bg-surface border border-border-soft rounded-[14px] p-[24px_26px] mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Classification Pipeline</h2>
          {hasStats && <span className="font-mono text-[12px] text-text-3">{doneDocs.length} docs · {triagePct}% filtered before LLM</span>}
        </div>
        <svg viewBox={`0 0 ${PIPE_W} ${PIPE_H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
          {ICON_CONFIGS.map((cfg, i) => {
            const a = stats[i];
            const cx = cardX(i);
            const usedPct = a.totalDocs > 0 ? a.used / a.totalDocs : 0;
            return (
              <g key={cfg.id}>
                {/* connector arrow */}
                {i < 2 && (
                  <line
                    x1={cx + CARD_W + 4} y1={CARD_Y + CARD_H / 2}
                    x2={cx + CARD_W + CARD_GAP - 4} y2={CARD_Y + CARD_H / 2}
                    stroke={cfg.color} strokeWidth={1.5}
                    markerEnd={`url(#pipe-arr-${i})`}
                  />
                )}
                <defs>
                  <marker id={`pipe-arr-${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill={cfg.color} />
                  </marker>
                </defs>
                {/* card background */}
                <rect x={cx} y={CARD_Y} width={CARD_W} height={CARD_H} rx={12} fill={cfg.bg} stroke={cfg.border} strokeWidth={1.2} />
                {/* icon */}
                <g transform={`translate(${cx + CARD_W / 2 - 12}, ${CARD_Y + 14})`}>
                  <svg viewBox="0 0 24 24" width={24} height={24}>
                    {cfg.icon === 'funnel' && <IconFunnel />}
                    {cfg.icon === 'scan'   && <IconScan />}
                    {cfg.icon === 'agent'  && <IconAgent />}
                  </svg>
                </g>
                {/* label */}
                <text x={cx + CARD_W / 2} y={CARD_Y + 58} fontFamily="Schibsted Grotesk, sans-serif" fontSize="14" fontWeight={600} fill="#eaf2ee" textAnchor="middle">{a.label}</text>
                {/* role chip */}
                <rect x={cx + CARD_W / 2 - 36} y={CARD_Y + 64} width={72} height={16} rx={4}
                  fill={cfg.color === '#2fd08a' ? 'rgba(47,208,138,0.12)' : 'rgba(111,138,126,0.12)'}
                  stroke={cfg.color === '#2fd08a' ? 'rgba(47,208,138,0.3)' : 'rgba(111,138,126,0.25)'}
                  strokeWidth={0.8}
                />
                <text x={cx + CARD_W / 2} y={CARD_Y + 75} fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="0.08em" fill={cfg.color} textAnchor="middle">{a.role.toUpperCase()}</text>

                {hasStats && (
                  <>
                    {/* big stat */}
                    <text x={cx + 20} y={CARD_Y + CARD_H - 36} fontFamily="JetBrains Mono, monospace" fontSize="22" fontWeight={600} fill={cfg.color}>{a.used}</text>
                    <text x={cx + 20 + String(a.used).length * 13 + 4} y={CARD_Y + CARD_H - 36} fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#6f8a7e"> docs</text>
                    {a.avgMs !== null && (
                      <>
                        <text x={cx + CARD_W - 20} y={CARD_Y + CARD_H - 36} fontFamily="JetBrains Mono, monospace" fontSize="22" fontWeight={600} fill={cfg.color} textAnchor="end">{a.avgMs}</text>
                        <text x={cx + CARD_W - 20} y={CARD_Y + CARD_H - 22} fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#6f8a7e" textAnchor="end">ms avg</text>
                      </>
                    )}
                    {/* usage bar */}
                    <rect x={cx + 16} y={CARD_Y + CARD_H - 16} width={CARD_W - 32} height={4} rx={2} fill="rgba(255,255,255,0.07)" />
                    <rect x={cx + 16} y={CARD_Y + CARD_H - 16} width={(CARD_W - 32) * usedPct} height={4} rx={2} fill={cfg.color} opacity="0.7" style={{ transition: 'width 0.5s' }} />
                  </>
                )}
                {!hasStats && (
                  <text x={cx + CARD_W / 2} y={CARD_Y + CARD_H - 20} fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#3a4a42" textAnchor="middle">run classification</text>
                )}
              </g>
            );
          })}

          {/* efficiency strip */}
          {hasStats && (
            <g transform={`translate(20, ${CARD_H + CARD_Y + 22})`}>
              <text x={0} y={10} fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="0.1em" fill="#6f8a7e">PIPELINE EFFICIENCY</text>
              <rect x={0} y={16} width={PIPE_W - 40} height={8} rx={4} fill="rgba(255,255,255,0.05)" />
              <rect x={0} y={16} width={(PIPE_W - 40) * triagePct / 100} height={8} rx={4} fill="rgba(47,208,138,0.45)" />
              <rect x={(PIPE_W - 40) * triagePct / 100} y={16} width={(PIPE_W - 40) * ocrPct / 100} height={8} rx={0} fill="rgba(245,185,66,0.5)" />
              <rect x={(PIPE_W - 40) * (triagePct + ocrPct) / 100} y={16} width={(PIPE_W - 40) * llmPct / 100} height={8} rx={4} fill="rgba(47,208,138,0.85)"
                style={{ borderRadius: '0 4px 4px 0' }}
              />
              <g transform="translate(0, 36)" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#9fb3a9">
                <rect x={0} y={-3} width={8} height={8} rx={2} fill="rgba(47,208,138,0.45)" />
                <text x={12} y={5}>Triage filtered {triagePct}%</text>
                <rect x={160} y={-3} width={8} height={8} rx={2} fill="rgba(245,185,66,0.5)" />
                <text x={172} y={5}>OCR enriched {ocrPct}%</text>
                <rect x={310} y={-3} width={8} height={8} rx={2} fill="rgba(47,208,138,0.85)" />
                <text x={322} y={5}>LLM classified {llmPct}%</text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* ── Tessera Analyst flow diagram ── */}
      <div className="bg-surface border border-border-soft rounded-[14px] p-[24px_26px]">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Tessera Analyst</h2>
          <span className="font-mono text-[10px] tracking-[0.1em] px-[7px] py-[3px] rounded border" style={{ color: 'var(--color-emerald)', borderColor: 'rgba(47,208,138,0.3)', background: 'rgba(47,208,138,0.07)' }}>LLM AGENT</span>
        </div>
        <svg viewBox={`0 0 ${TA_SVG_W} 110`} width="100%" style={{ display: 'block', maxWidth: TA_SVG_W }}>
          <defs>
            {TA_NODES.map((n, i) => (
              <marker key={i} id={`ta-arr-${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={n.color} opacity="0.6" />
              </marker>
            ))}
          </defs>
          {TA_NODES.map((n, i) => {
            const x = tnX(i);
            const midY = 36;
            return (
              <g key={i}>
                {/* connector */}
                {i < TA_NODES.length - 1 && (
                  <line
                    x1={x + TN_W + 3} y1={midY}
                    x2={x + TN_W + TN_GAP - 3} y2={midY}
                    stroke={n.color} strokeWidth={1.2} strokeDasharray={i === 2 ? '3,2' : 'none'}
                    markerEnd={`url(#ta-arr-${i})`} opacity="0.6"
                  />
                )}
                {/* node */}
                <rect x={x} y={2} width={TN_W} height={TN_H} rx={10} fill={n.bg} stroke={n.border} strokeWidth={1.2} />
                {/* label (may contain \n) */}
                {n.label.split('\n').map((line, li) => (
                  <text key={li} x={x + TN_W / 2} y={24 + li * 16} fontFamily="Schibsted Grotesk, sans-serif" fontSize="13" fontWeight={600} fill={n.color} textAnchor="middle">{line}</text>
                ))}
                <text x={x + TN_W / 2} y={TN_H - 8} fontFamily="JetBrains Mono, monospace" fontSize="9" fill={n.color} textAnchor="middle" opacity="0.55">{n.sub.split(' · ')[0]}</text>
              </g>
            );
          })}
          {/* footnote row */}
          <g transform={`translate(20, 86)`} fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#6f8a7e">
            <text x={0}>Streaming · tokens arrive word by word</text>
            <text x={260}>Last 6 turns kept as context</text>
            <text x={480}>Nothing leaves localhost</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
