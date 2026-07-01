import { useRef, useState } from 'react';
import type { DocType, TessDoc } from '../lib/types';
import { money } from '../lib/format';
import { filesFromDataTransfer } from '../lib/dropFiles';

const TYPE_NAME: Record<DocType, string> = { po: 'Purchase order', invoice: 'Invoice', grn: 'Goods receipt', customs: 'Customs', junk: 'Junk' };

interface Props {
  docs: TessDoc[];
  ingestRunning: boolean;
  filter: string;
  dragOver: boolean;
  onAddFiles: (files: FileList | File[] | null) => void;
  onLoadSample: () => void;
  onRunIngest: () => void;
  onStopIngest: () => void;
  onSetFilter: (f: string) => void;
  onSetDragOver: (v: boolean) => void;
  onSelectDoc: (id: number) => void;
}

export default function DataLake({
  docs, ingestRunning, filter, dragOver, onAddFiles, onLoadSample, onRunIngest, onStopIngest, onSetFilter, onSetDragOver, onSelectDoc,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [statModal, setStatModal] = useState<string | null>(null);

  const total = docs.length;
  const queued = docs.filter((d) => d.status === 'queued').length;
  const doneCount = docs.filter((d) => d.status === 'done').length;
  const ingestComplete = doneCount > 0 && queued === 0 && !ingestRunning;
  const routed = docs.filter((d) => d.status === 'done' && !d.isJunk).length;
  const quarN = docs.filter((d) => d.status === 'done' && d.isJunk).length;
  const reviewN = docs.filter((d) => d.status === 'done' && d.needsReview).length;
  const policyN = docs.filter((d) => d.status === 'done' && !!d.policyFlags?.length).length;

  const lakeSub = total === 0
    ? 'Drop files or load the sample set to begin'
    : ingestComplete
    ? `${total} documents classified by the engine`
    : ingestRunning
    ? 'Reading and classifying documents…'
    : `${total} documents staged — ${queued} queued for classification`;

  const STAT_MATCH: Record<string, (d: TessDoc) => boolean> = {
    total: () => true,
    routed: (d) => d.status === 'done' && !d.isJunk,
    quarantined: (d) => d.status === 'done' && d.isJunk,
    review: (d) => d.status === 'done' && !!d.needsReview,
    policy: (d) => d.status === 'done' && !!d.policyFlags?.length,
  };

  const lakeStats = [
    { key: 'total', value: String(total), label: 'documents in lake', color: 'var(--color-text)', clickable: total > 0 },
    { key: 'routed', value: doneCount ? String(routed) : '—', label: 'routed to processing', color: doneCount ? 'var(--color-emerald)' : 'var(--color-text-2)', clickable: routed > 0 },
    { key: 'quarantined', value: doneCount ? String(quarN) : '—', label: 'quarantined as noise', color: 'var(--color-text-2)', clickable: quarN > 0 },
    { key: 'review', value: doneCount ? String(reviewN) : '—', label: 'flagged for review', color: reviewN ? 'var(--color-amber)' : 'var(--color-text-2)', clickable: reviewN > 0 },
    { key: 'policy', value: doneCount ? String(policyN) : '—', label: 'policy violations', color: policyN ? 'var(--color-coral)' : 'var(--color-text-2)', clickable: policyN > 0 },
  ];

  const modalDocs = statModal ? docs.filter(STAT_MATCH[statModal]) : [];
  const modalTitle = statModal ? lakeStats.find((s) => s.key === statModal)?.label : '';

  const cnt = (t: DocType) => docs.filter((d) => d.status === 'done' && d.type === t).length;
  const chipDef = [
    { key: 'all', label: 'All', n: total },
    { key: 'po', label: 'Purchase orders', n: cnt('po') },
    { key: 'invoice', label: 'Invoices', n: cnt('invoice') },
    { key: 'grn', label: 'Goods receipts', n: cnt('grn') },
    { key: 'customs', label: 'Customs', n: cnt('customs') },
    { key: 'review', label: 'Needs review', n: reviewN },
    { key: 'quarantined', label: 'Quarantined', n: quarN },
  ];
  const chips = chipDef.filter((c) => c.key === 'all' || c.n > 0);
  const showChips = doneCount > 0 && chips.length > 1;

  const filteredDocs = docs.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'quarantined') return d.isJunk;
    if (filter === 'review') return d.needsReview && d.status === 'done';
    if (d.status !== 'done') return true;
    return d.type === filter;
  });

  const showIngestBtn = total > 0;

  return (
    <div>
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <h1 className="text-[34px] font-semibold tracking-[-0.02em] mb-[6px]">Data lake</h1>
          <p className="text-[16px] text-text-2">{lakeSub}</p>
        </div>
        {showIngestBtn && (
          <div className="flex items-center gap-3">
            {queued > 0 || ingestRunning ? (
              <button
                onClick={ingestRunning ? undefined : onRunIngest}
                className="font-mono text-[13px] font-medium tracking-[0.05em] px-[22px] py-[13px] rounded-[9px] border-none"
                style={
                  ingestRunning
                    ? { background: 'var(--color-raised)', color: 'var(--color-emerald)', cursor: 'default' }
                    : { background: 'var(--color-emerald)', color: 'var(--color-emerald-ink)', cursor: 'pointer' }
                }
              >
                {ingestRunning ? `CLASSIFYING ${doneCount} / ${total}…` : `▶  RUN CLASSIFICATION (${queued})`}
              </button>
            ) : (
              <div className="flex items-center gap-[8px] font-mono text-[12px] tracking-[0.06em]" style={{ color: 'var(--color-emerald)' }}>
                <span className="w-[7px] h-[7px] rounded-full bg-emerald flex-shrink-0" style={{ boxShadow: '0 0 0 3px rgba(47,208,138,0.15)' }} />
                {doneCount} DOCS CLASSIFIED
              </div>
            )}
            {ingestRunning && (
              <button
                onClick={onStopIngest}
                className="font-mono text-[13px] font-medium tracking-[0.05em] px-[22px] py-[13px] rounded-[9px] cursor-pointer"
                style={{ background: 'rgba(242,104,95,0.12)', color: 'var(--color-coral)', border: '1px solid rgba(242,104,95,0.3)' }}
              >
                ■  STOP
              </button>
            )}
          </div>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); if (!dragOver) onSetDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); onSetDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          onSetDragOver(false);
          const dt = e.dataTransfer;
          filesFromDataTransfer(dt).then(onAddFiles);
        }}
        className="flex flex-col items-center justify-center p-[40px_24px] rounded-[16px] transition-all"
        style={{
          border: `1.5px dashed ${dragOver ? 'rgba(47,208,138,0.8)' : 'rgba(255,255,255,0.16)'}`,
          background: dragOver ? 'rgba(47,208,138,0.06)' : 'var(--color-sidebar)',
        }}
      >
        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => { onAddFiles(e.target.files); e.target.value = ''; }}
        />
        <input
          type="file"
          multiple
          ref={folderInputRef}
          // non-standard but universally supported attrs for directory picking
          {...{ webkitdirectory: 'true', directory: 'true' }}
          style={{ display: 'none' }}
          onChange={(e) => { onAddFiles(e.target.files); e.target.value = ''; }}
        />
        <div className="font-mono text-[30px] text-emerald mb-[14px]">&#8615;</div>
        <div className="text-[19px] font-semibold mb-[6px]">Drop documents to ingest</div>
        <div className="text-[14px] text-text-2 max-w-[520px] text-center leading-[1.45]">
          PDF, TXT, CSV, EML, JSON, HTML — or anything. Drop individual files or a whole folder; each file is read, classified, and its fields extracted on arrival.
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald text-emerald-ink border-none font-mono text-[13px] font-medium tracking-[0.04em] px-5 py-[11px] rounded-[8px] cursor-pointer"
          >
            BROWSE FILES
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="bg-transparent text-text-soft border border-white/16 font-mono text-[13px] tracking-[0.04em] px-5 py-[11px] rounded-[8px] cursor-pointer"
          >
            BROWSE FOLDER
          </button>
          <button
            onClick={onLoadSample}
            className="bg-transparent text-text-soft border border-white/16 font-mono text-[13px] tracking-[0.04em] px-5 py-[11px] rounded-[8px] cursor-pointer"
          >
            LOAD SAMPLE SET
          </button>
        </div>
      </div>

      {total > 0 && (
        <div>
          <div className="grid grid-cols-5 gap-4 my-6">
            {lakeStats.map((s) => (
              <div
                key={s.key}
                onClick={s.clickable ? () => setStatModal(s.key) : undefined}
                className="bg-surface border border-border-soft rounded-[12px] p-[20px_22px] transition-colors"
                style={{ cursor: s.clickable ? 'pointer' : 'default' }}
                onMouseEnter={(e) => { if (s.clickable) e.currentTarget.style.borderColor = 'rgba(47,208,138,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = ''; }}
              >
                <div className="font-mono text-[30px] font-medium tracking-[-0.01em]" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[14px] text-text-2 mt-[6px]">{s.label}</div>
              </div>
            ))}
          </div>

          {showChips && (
            <div className="flex flex-wrap gap-[9px] mb-[22px]">
              {chips.map((c) => {
                const on = filter === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => onSetFilter(c.key)}
                    className="font-mono text-[12px] px-[13px] py-2 rounded-[7px] cursor-pointer"
                    style={{
                      border: `1px solid ${on ? 'rgba(47,208,138,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      background: on ? 'rgba(47,208,138,0.1)' : 'transparent',
                      color: on ? 'var(--color-emerald)' : 'var(--color-text-2)',
                    }}
                  >
                    {c.label} · {c.n}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid gap-[14px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(224px, 1fr))' }}>
            {filteredDocs.map((d) => <DocTile key={d.id} doc={d} onClick={() => onSelectDoc(d.id)} />)}
          </div>
        </div>
      )}

      {statModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setStatModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-border-soft rounded-[16px] w-full max-w-[860px] max-h-[80vh] flex flex-col"
            style={{ animation: 'ts-rise 0.15s ease' }}
          >
            <div className="flex items-center justify-between p-[18px_24px] border-b border-border-soft">
              <div>
                <div className="font-mono text-[11px] tracking-[0.1em] text-text-3 mb-1">DATA LAKE</div>
                <div className="text-[19px] font-semibold">{modalDocs.length} {modalTitle}</div>
              </div>
              <button onClick={() => setStatModal(null)} className="bg-transparent border-none text-text-2 text-[18px] cursor-pointer">✕</button>
            </div>
            <div className="overflow-y-auto p-[20px_24px]">
              <div className="grid gap-[14px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(224px, 1fr))' }}>
                {modalDocs.map((d) => (
                  <DocTile key={d.id} doc={d} onClick={() => { onSelectDoc(d.id); setStatModal(null); }} />
                ))}
                {!modalDocs.length && <div className="text-[14px] text-text-3">No documents in this category.</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocTile({ doc: d, onClick }: { doc: TessDoc; onClick: () => void }) {
  const isDone = d.status === 'done';
  const isClassifying = d.status === 'classifying';
  const isQueued = d.status === 'queued';
  const review = isDone && d.needsReview;
  const quar = isDone && d.isJunk;

  let border = 'rgba(255,255,255,0.07)';
  if (isClassifying) border = 'rgba(47,208,138,0.5)';
  else if (review) border = 'rgba(245,185,66,0.4)';

  let pillStyle: React.CSSProperties = {};
  let pillLabel = '';
  let metaLabel = '';
  if (quar) { pillStyle = { background: 'rgba(255,255,255,0.05)', color: '#6f8a7e' }; pillLabel = 'Quarantined'; metaLabel = 'noise'; }
  else if (review) { pillStyle = { background: 'rgba(245,185,66,0.14)', color: '#f5b942' }; pillLabel = TYPE_NAME[d.type!] || 'Document'; metaLabel = `${Math.round((d.confidence || 0) * 100)}% · review`; }
  else if (isDone) { pillStyle = { background: 'rgba(47,208,138,0.12)', color: '#2fd08a' }; pillLabel = TYPE_NAME[d.type!] || 'Document'; metaLabel = `${Math.round((d.confidence || 0) * 100)}%`; }

  let extractLine = '';
  let showExtract = false;
  if (isDone && !d.isJunk) {
    const f = d.fields || {};
    const bits: string[] = [];
    if (f.vendor) bits.push(f.vendor);
    if (f.total != null) bits.push(money(f.currency, f.total));
    if (!bits.length && f.poRef) bits.push(f.poRef);
    if (!bits.length && f.summary) bits.push(f.summary);
    if (bits.length) { extractLine = bits.join(' · '); showExtract = true; }
  } else if (isDone && d.isJunk && d.fields?.summary) { extractLine = d.fields.summary; showExtract = true; }

  return (
    <div
      onClick={isDone ? onClick : undefined}
      className="bg-surface rounded-[10px] p-[13px_14px] flex flex-col gap-[6px] min-w-0"
      style={{
        border: `1px solid ${border}`,
        opacity: quar ? 0.55 : 1,
        animation: isClassifying ? 'ts-pulse 1s ease infinite' : undefined,
        cursor: isDone ? 'pointer' : 'default',
      }}
    >
      <div className="font-mono text-[13px] text-text whitespace-nowrap overflow-hidden text-ellipsis">{d.name}</div>
      <div className="font-mono text-[11px] text-text-3">{d.source}</div>
      <div className="flex items-center gap-2 mt-[2px] min-h-[22px]">
        {isQueued && <span className="font-mono text-[11px] text-text-3">queued</span>}
        {isClassifying && (
          <>
            <span
              className="w-[11px] h-[11px] rounded-full"
              style={{ border: '2px solid rgba(47,208,138,0.3)', borderTopColor: '#2fd08a', animation: 'ts-spin 0.7s linear infinite' }}
            />
            <span className="font-mono text-[11px] text-emerald">reading…</span>
          </>
        )}
        {isDone && (
          <>
            <span className="font-mono text-[11px] tracking-[0.02em] px-2 py-[3px] rounded-[5px] whitespace-nowrap" style={pillStyle}>{pillLabel}</span>
            <span className="font-mono text-[11px] text-text-3">{metaLabel}</span>
          </>
        )}
      </div>
      {showExtract && (
        <div className="font-mono text-[11px] text-text-2 whitespace-nowrap overflow-hidden text-ellipsis border-t border-border-soft pt-[7px] mt-[1px]">
          {extractLine}
        </div>
      )}
    </div>
  );
}
