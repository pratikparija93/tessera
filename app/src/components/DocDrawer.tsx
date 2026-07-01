import { useEffect, useMemo, useState } from 'react';
import type { DocType, TessDoc } from '../lib/types';
import { money } from '../lib/format';
import { buildGroups } from '../lib/reconcile';
import TrailGraph from './TrailGraph';

const TYPE_NAME: Record<DocType, string> = { po: 'Purchase order', invoice: 'Invoice', grn: 'Goods receipt', customs: 'Customs', junk: 'Junk' };
const TYPE_COLOR: Record<DocType, string> = { po: '#2fd08a', invoice: '#2fd08a', grn: '#2fd08a', customs: '#2fd08a', junk: '#6f8a7e' };

interface Props {
  doc: TessDoc;
  docs: TessDoc[];
  onClose: () => void;
  onUpdateDoc?: (id: number, patch: Partial<TessDoc>) => void;
}

export default function DocDrawer({ doc, docs, onClose, onUpdateDoc }: Props) {
  const [noteInput, setNoteInput] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const group = useMemo(() => {
    if (doc.isJunk || doc.status !== 'done') return undefined;
    const groups = buildGroups(docs);
    return groups.find((g) => g.po?.id === doc.id || g.grns.some((d) => d.id === doc.id) || g.invs.some((d) => d.id === doc.id));
  }, [doc, docs]);

  const color = doc.needsReview && !doc.isJunk ? '#f5b942' : TYPE_COLOR[doc.type || 'junk'];
  const fields = doc.fields || {};
  const fieldRows: [string, string][] = [
    ['Vendor', fields.vendor ?? '—'],
    ['Country', fields.country ?? '—'],
    ['Currency', fields.currency ?? '—'],
    ['Document ID', fields.docId ?? '—'],
    ['PO reference', fields.poRef ?? '—'],
    ['Total amount', fields.total != null ? money(fields.currency, fields.total) : '—'],
    ['Quantity', fields.qty != null ? Number(fields.qty).toLocaleString() : '—'],
    ['Summary', fields.summary ?? '—'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] h-full bg-surface border-l border-border-soft overflow-y-auto"
        style={{ animation: 'ts-rise 0.2s ease' }}
      >
        <div className="flex items-center justify-between p-[20px_24px] border-b border-border-soft sticky top-0 bg-surface">
          <div className="font-mono text-[12px] text-text-3 tracking-[0.1em]">DOCUMENT DETAIL</div>
          <button onClick={onClose} className="bg-transparent border-none text-text-2 text-[18px] cursor-pointer">✕</button>
        </div>

        <div className="p-[24px]">
          <div className="font-mono text-[13px] text-text-3 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{doc.name}</div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[24px] font-semibold" style={{ color }}>
              {doc.isJunk ? 'Quarantined' : TYPE_NAME[doc.type || 'junk']}
            </span>
            <span className="font-mono text-[14px] text-text-2">{Math.round((doc.confidence || 0) * 100)}% confidence</span>
          </div>

          {doc.needsReview && !doc.isJunk && (
            <div
              className="mt-5 rounded-[10px] p-[14px_16px]"
              style={{
                background: doc.reviewStatus === 'approved' ? 'rgba(47,208,138,0.07)' : doc.reviewStatus === 'rejected' ? 'rgba(242,104,95,0.07)' : 'rgba(245,185,66,0.07)',
                border: `1px solid ${doc.reviewStatus === 'approved' ? 'rgba(47,208,138,0.3)' : doc.reviewStatus === 'rejected' ? 'rgba(242,104,95,0.3)' : 'rgba(245,185,66,0.3)'}`,
              }}
            >
              <div className="font-mono text-[11px] tracking-[0.1em] mb-[10px]" style={{
                color: doc.reviewStatus === 'approved' ? 'var(--color-emerald)' : doc.reviewStatus === 'rejected' ? 'var(--color-coral)' : 'var(--color-amber)',
              }}>
                {doc.reviewStatus === 'approved' ? '✓ APPROVED' : doc.reviewStatus === 'rejected' ? '✕ REJECTED' : '⚠ HUMAN REVIEW REQUIRED'}
              </div>

              {!doc.reviewStatus && onUpdateDoc && (
                <div className="flex flex-col gap-2">
                  <div className="text-[13px] text-text-2 mb-1">Classification confidence below threshold — approve or reject this document.</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onUpdateDoc(doc.id, { reviewStatus: 'approved', needsReview: false })}
                      className="flex-1 font-mono text-[12px] tracking-[0.04em] py-[9px] rounded-[7px] border-none cursor-pointer"
                      style={{ background: 'rgba(47,208,138,0.15)', color: 'var(--color-emerald)' }}
                    >✓ APPROVE</button>
                    <button
                      onClick={() => onUpdateDoc(doc.id, { reviewStatus: 'rejected', needsReview: false })}
                      className="flex-1 font-mono text-[12px] tracking-[0.04em] py-[9px] rounded-[7px] border-none cursor-pointer"
                      style={{ background: 'rgba(242,104,95,0.12)', color: 'var(--color-coral)' }}
                    >✕ REJECT</button>
                    <button
                      onClick={() => setNoteOpen((o) => !o)}
                      className="font-mono text-[12px] tracking-[0.04em] px-[12px] py-[9px] rounded-[7px] cursor-pointer"
                      style={{ background: 'var(--color-raised)', border: '1px solid var(--color-border-soft)', color: 'var(--color-text-2)' }}
                    >+ NOTE</button>
                  </div>
                  {noteOpen && (
                    <div className="flex gap-2 mt-1">
                      <input
                        autoFocus
                        type="text"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && noteInput.trim() && onUpdateDoc) {
                            onUpdateDoc(doc.id, { reviewNote: noteInput.trim() });
                            setNoteOpen(false);
                          }
                        }}
                        placeholder="Add a note and press Enter…"
                        className="flex-1 bg-raised border border-border-soft rounded-[7px] px-[10px] py-[7px] font-mono text-[12px] text-text outline-none placeholder:text-text-3"
                      />
                    </div>
                  )}
                </div>
              )}

              {doc.reviewStatus && (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px]" style={{ color: doc.reviewStatus === 'approved' ? 'var(--color-emerald)' : 'var(--color-coral)' }}>
                    {doc.reviewStatus === 'approved' ? 'Document approved for processing.' : 'Document rejected — excluded from reconciliation.'}
                  </div>
                  {onUpdateDoc && (
                    <button
                      onClick={() => onUpdateDoc(doc.id, { reviewStatus: undefined, needsReview: true })}
                      className="font-mono text-[10px] text-text-3 hover:text-text-2 border border-border-soft rounded-[5px] px-[8px] py-[4px] bg-transparent cursor-pointer"
                    >UNDO</button>
                  )}
                </div>
              )}

              {doc.reviewNote && (
                <div className="mt-2 font-mono text-[11px] text-text-2 bg-cell rounded-[6px] px-[10px] py-[6px]">
                  Note: {doc.reviewNote}
                </div>
              )}
            </div>
          )}

          {!!doc.policyFlags?.length && (
            <div className="mt-5">
              <div className="font-mono text-[11px] tracking-[0.12em] text-coral mb-2">POLICY FLAGS</div>
              <div className="flex flex-col gap-2">
                {doc.policyFlags.map((f) => (
                  <div
                    key={f.ruleId}
                    className="flex items-start gap-3 rounded-[8px] px-[13px] py-[10px]"
                    style={{
                      background: f.severity === 'block' ? 'rgba(242,104,95,0.07)' : 'rgba(245,185,66,0.07)',
                      border: `1px solid ${f.severity === 'block' ? 'rgba(242,104,95,0.28)' : 'rgba(245,185,66,0.28)'}`,
                    }}
                  >
                    <span className="font-mono text-[11px] mt-[1px] flex-shrink-0" style={{ color: f.severity === 'block' ? 'var(--color-coral)' : 'var(--color-amber)' }}>
                      {f.severity === 'block' ? '⊘' : '⚠'}
                    </span>
                    <div>
                      <div className="font-mono text-[10px] tracking-[0.08em] mb-[3px]" style={{ color: f.severity === 'block' ? 'var(--color-coral)' : 'var(--color-amber)' }}>
                        {f.severity === 'block' ? 'BLOCKED' : 'WARNING'}
                      </div>
                      <div className="text-[13px] text-text-2">{f.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {doc.previewUrl && (
            <div className="mt-5">
              <div className="font-mono text-[11px] tracking-[0.12em] text-text-3 mb-2 flex items-center justify-between">
                <span>PREVIEW</span>
                <button
                  onClick={() => window.open(doc.previewUrl, '_blank', 'noopener,noreferrer')}
                  className="font-mono text-[11px] text-emerald bg-transparent border-none cursor-pointer underline-offset-2 hover:underline"
                >
                  view full size &#8599;
                </button>
              </div>
              <div
                onClick={() => window.open(doc.previewUrl, '_blank', 'noopener,noreferrer')}
                className="rounded-[10px] overflow-hidden border border-border-soft bg-cell cursor-zoom-in flex items-center justify-center"
                style={{ height: 220 }}
              >
                {doc.previewIsRealFile && /\.pdf$/i.test(doc.name) ? (
                  <iframe src={doc.previewUrl} title="preview" className="w-full h-full pointer-events-none" />
                ) : (
                  <img src={doc.previewUrl} alt="" className="max-w-full max-h-full object-contain" />
                )}
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="font-mono text-[11px] tracking-[0.12em] text-emerald mb-2">REASONING</div>
            <div className="text-[15px] text-text-soft leading-[1.5]">{doc.reasoning || '—'}</div>
          </div>

          <div className="mt-6">
            <div className="font-mono text-[11px] tracking-[0.12em] text-amber mb-2">DETECTED SIGNALS</div>
            <div className="flex flex-col gap-2">
              {(doc.signals || []).map((s, i) => (
                <div key={i} className="font-mono text-[12px] text-text-2 bg-cell rounded-[6px] px-3 py-2">{s}</div>
              ))}
              {!doc.signals?.length && <div className="text-[13px] text-text-3">No signals recorded.</div>}
            </div>
          </div>

          {!!doc.pipelineLog?.length && (
            <div className="mt-6">
              <div className="font-mono text-[11px] tracking-[0.12em] text-text-3 mb-2">AGENT PIPELINE</div>
              <div className="flex flex-col gap-[6px]">
                {doc.pipelineLog.map((step, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 font-mono text-[11px] bg-cell rounded-[6px] px-3 py-2">
                    <span className="flex items-center gap-2 text-text-2">
                      <span
                        className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                        style={{
                          background: step.outcome === 'used' ? '#2fd08a' : step.outcome === 'error' ? '#f2685f' : '#6f8a7e',
                        }}
                      />
                      {step.agent}
                    </span>
                    <span className="text-text-3">{step.outcome} · {step.durationMs.toFixed(0)}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {group && (
            <div className="mt-6">
              <div className="font-mono text-[11px] tracking-[0.12em] text-text-3 mb-2">DOCUMENT TRAIL</div>
              <TrailGraph group={group} highlightDocId={doc.id} width={360} />
            </div>
          )}

          <div className="mt-6">
            <div className="font-mono text-[11px] tracking-[0.12em] text-text-3 mb-2">EXTRACTED FIELDS</div>
            <div className="flex flex-col">
              {fieldRows.map(([label, val]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-[8px] border-t border-border-soft">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">{label}</span>
                  <span className="text-[14px] text-text text-right">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="font-mono text-[11px] tracking-[0.12em] text-text-3 mb-2">TEXT EXCERPT</div>
            {doc.excerpt ? (
              <div className="font-mono text-[12px] text-text-2 bg-cell rounded-[8px] p-3 max-h-[220px] overflow-y-auto leading-[1.5]">
                {doc.excerpt}
              </div>
            ) : (
              <div className="text-[13px] text-text-3">No extractable text — OCR not available in this build.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
