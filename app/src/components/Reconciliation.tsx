import { useMemo } from 'react';
import type { GroupStatus, ReconGroup, TessDoc, View } from '../lib/types';
import { buildGroups } from '../lib/reconcile';
import { money, k } from '../lib/format';
import TrailGraph from './TrailGraph';

const EX_LABEL: Record<GroupStatus, string> = {
  matched: '✓ Matched', price: 'Price variance', short: 'Short delivery', duplicate: 'Duplicate invoice',
  missing_grn: 'Missing GRN', missing_po: 'No matching PO', await_invoice: 'Awaiting invoice', orphan: 'Awaiting counterpart',
};

const DETAIL_BODY: Partial<Record<GroupStatus, (g: ReconGroup) => string>> = {
  price: (g) => `The invoice from ${g.vendor} bills ${money(g.cur, g.invTotal)} against a purchase order of ${money(g.cur, g.poTotal)} — an overcharge of ${money(g.cur, (g.invTotal || 0) - (g.poTotal || 0))}. Goods were received, so this is a pricing discrepancy, not a delivery issue.`,
  short: (g) => `Only ${(g.recvQty || 0).toLocaleString()} of ${(g.poQty || 0).toLocaleString()} ordered units were received from ${g.vendor}, but the invoice bills for the full order.`,
  duplicate: (g) => `Invoice ${g.inv?.fields.docId || ''} from ${g.vendor} appears ${g.invs.length} times in this batch. Paying each copy would multiply a single charge.`,
  missing_grn: (g) => `A purchase order and matching invoice exist for ${g.vendor}, but no goods receipt confirms delivery. Paying now risks releasing ${money(g.cur, g.invTotal)} for goods that may not have arrived.`,
  missing_po: (g) => `An invoice for ${money(g.cur, g.invTotal)} from ${g.vendor} has no matching purchase order in this batch. It cannot be validated against an approved commitment.`,
};

const DETAIL_ACTION: Partial<Record<GroupStatus, string>> = {
  price: 'Hold the difference and dispute the overbilling against the agreed PO price before releasing payment.',
  short: 'Withhold payment on the undelivered units, or request a corrected invoice matching the goods receipt.',
  duplicate: 'Pay once and block the duplicate. Flag the vendor feed for repeated submissions.',
  missing_grn: 'Hold payment until the warehouse confirms receipt, then release against the goods-received note.',
  missing_po: 'Hold the invoice and locate or raise the matching purchase order before approving.',
};

interface Props {
  docs: TessDoc[];
  reconcileRunning: boolean;
  reconcileIdx: number;
  reconcileDone: boolean;
  expanded: string | null;
  onRunReconcile: () => void;
  onToggleExpand: (key: string) => void;
  onGoTo: (v: View) => void;
}

export default function Reconciliation({
  docs, reconcileRunning, reconcileIdx, reconcileDone, expanded, onRunReconcile, onToggleExpand, onGoTo,
}: Props) {
  const doneCount = docs.filter((d) => d.status === 'done').length;
  const groups = useMemo(() => (doneCount > 0 ? buildGroups(docs) : []), [docs, doneCount]);

  if (doneCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-[120px_20px]">
        <div className="w-[52px] h-[52px] rounded-[14px] bg-surface border border-white/8 flex items-center justify-center text-[24px] text-text-3 mb-[22px]">&#9647;</div>
        <h2 className="text-[26px] font-semibold mb-[10px]">Ingest some documents first</h2>
        <p className="text-[16px] text-text-2 mb-[26px] max-w-[460px]">
          Reconciliation runs on classified documents. Upload or load a sample set, run ingestion, then return to match the lifecycle.
        </p>
        <button
          onClick={() => onGoTo('lake')}
          className="bg-emerald text-emerald-ink border-none font-mono text-[14px] font-medium tracking-[0.04em] px-[22px] py-[13px] rounded-[9px] cursor-pointer"
        >
          GO TO DATA LAKE &rarr;
        </button>
      </div>
    );
  }

  const ordered = [...groups].sort((a, b) => (b.isEx ? 1 : 0) - (a.isEx ? 1 : 0) || (b.risk || 0) - (a.risk || 0));
  const matchedN = groups.filter((g) => g.status === 'matched').length;
  const exGroups = groups.filter((g) => g.isEx);
  const exN = exGroups.length;
  const riskTotal = groups.reduce((a, g) => a + (g.risk || 0), 0);

  return (
    <div>
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <h1 className="text-[34px] font-semibold tracking-[-0.02em] mb-[6px]">Reconciliation</h1>
          <p className="text-[16px] text-text-2">Three-way match · purchase order &rarr; goods received &rarr; invoice, grouped by PO reference</p>
        </div>
        <button
          onClick={onRunReconcile}
          disabled={reconcileRunning}
          className="font-mono text-[13px] font-medium tracking-[0.05em] px-[22px] py-[13px] rounded-[9px] border-none"
          style={
            reconcileRunning
              ? { background: 'var(--color-raised)', color: 'var(--color-emerald)', cursor: 'default' }
              : reconcileDone
              ? { background: 'rgba(47,208,138,0.12)', color: 'var(--color-emerald)', cursor: 'pointer' }
              : { background: 'var(--color-emerald)', color: 'var(--color-emerald-ink)', cursor: 'pointer' }
          }
        >
          {reconcileRunning
            ? `MATCHING ${reconcileIdx} / ${groups.length}…`
            : reconcileDone
            ? '✓  RECONCILIATION COMPLETE'
            : '▶  RUN RECONCILIATION'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-[26px]">
        <div className="bg-surface border border-border-soft rounded-[12px] p-[20px_22px]">
          <div className="font-mono text-[30px] font-medium text-emerald">{reconcileDone ? matchedN : '—'}</div>
          <div className="text-[14px] text-text-2 mt-[6px]">matched &amp; cleared</div>
          {!reconcileDone && <div className="font-mono text-[10px] text-text-3 mt-[8px] tracking-[0.06em]">run to reveal</div>}
        </div>
        <div className="bg-surface border border-border-soft rounded-[12px] p-[20px_22px]">
          <div className="font-mono text-[30px] font-medium text-amber">{reconcileDone ? exN : '—'}</div>
          <div className="text-[14px] text-text-2 mt-[6px]">exceptions flagged</div>
          {!reconcileDone && <div className="font-mono text-[10px] text-text-3 mt-[8px] tracking-[0.06em]">run to reveal</div>}
        </div>
        <div className="bg-surface border border-border-soft rounded-[12px] p-[20px_22px]">
          <div className="font-mono text-[30px] font-medium text-coral">{reconcileDone ? k(riskTotal) : '—'}</div>
          <div className="text-[14px] text-text-2 mt-[6px]">value at risk surfaced</div>
          {!reconcileDone && <div className="font-mono text-[10px] text-text-3 mt-[8px] tracking-[0.06em]">run to reveal</div>}
        </div>
      </div>

      <div className="flex flex-col gap-[14px]">
        {ordered.map((g, i) => (
          <TxnCard
            key={g.key}
            g={g}
            resolved={reconcileDone || i < reconcileIdx}
            resolving={reconcileRunning && i === reconcileIdx}
            open={expanded === g.key}
            onToggle={() => onToggleExpand(g.key)}
          />
        ))}
      </div>
    </div>
  );
}

function TxnCard({ g, resolved, resolving, open, onToggle }: { g: ReconGroup; resolved: boolean; resolving: boolean; open: boolean; onToggle: () => void }) {
  const norm = '#eaf2ee', coral = '#f2685f', faint = '#6f8a7e';

  let pillBg = 'transparent', pillColor = faint, pillBorder = 'rgba(255,255,255,0.1)', pillLabel = resolving ? 'matching…' : 'pending';
  if (resolved) {
    if (g.status === 'matched') { pillBg = 'rgba(47,208,138,0.07)'; pillColor = '#2fd08a'; pillBorder = 'rgba(47,208,138,0.35)'; pillLabel = '✓ Matched'; }
    else if (g.isEx) { pillBg = 'transparent'; pillColor = '#f5b942'; pillBorder = 'rgba(245,185,66,0.5)'; pillLabel = EX_LABEL[g.status]; }
    else { pillBg = 'transparent'; pillColor = '#9fb3a9'; pillBorder = 'rgba(159,179,169,0.25)'; pillLabel = EX_LABEL[g.status]; }
  }

  const poCol = { label: 'Purchase order', main: g.po ? money(g.cur, g.poTotal) : 'No PO', sub: g.po ? (g.po.fields.poRef || g.ref) : 'not in this batch', flag: !g.po && resolved && g.status === 'missing_po' };
  let grnMain: string, grnSub: string, grnFlag = false;
  if (g.grns.length === 0) { grnMain = 'Not received'; grnSub = 'no GRN on file'; grnFlag = g.status === 'missing_grn'; }
  else if (g.poQty && g.recvQty && g.recvQty < g.poQty) { grnMain = `${g.recvQty.toLocaleString()} / ${g.poQty.toLocaleString()}`; grnSub = 'units · short delivery'; grnFlag = true; }
  else { grnMain = 'Received'; grnSub = g.recvQty ? g.recvQty.toLocaleString() + ' units' : 'confirmed'; }
  const grnCol = { label: 'Goods received', main: grnMain, sub: grnSub, flag: grnFlag && resolved };

  let invSub = g.inv ? (g.inv.fields.docId || 'invoice') : 'no invoice yet';
  let invFlag = false;
  if (g.status === 'price') { invSub = 'over PO price'; invFlag = true; }
  else if (g.status === 'duplicate') { invSub = (g.inv?.fields.docId || 'invoice') + ' · submitted 2×'; invFlag = true; }
  const invCol = { label: 'Invoice', main: g.inv ? money(g.cur, g.invTotal) : 'No invoice', sub: invSub, flag: invFlag && resolved };

  const cols = [poCol, grnCol, invCol].map((c) => ({ ...c, color: c.flag ? coral : norm, subColor: c.flag ? coral : faint }));

  const canExpand = resolved;
  const showDetail = canExpand && open;

  let cardBorder = 'rgba(255,255,255,0.07)';
  if (resolving) cardBorder = 'rgba(47,208,138,0.4)';
  else if (resolved && g.isEx) cardBorder = 'rgba(245,185,66,0.28)';
  else if (resolved && g.status === 'matched') cardBorder = 'rgba(47,208,138,0.18)';

  return (
    <div
      className="bg-surface rounded-[13px] overflow-hidden"
      style={{ border: `1px solid ${cardBorder}`, animation: resolving ? 'ts-pulse 1s ease infinite' : undefined }}
    >
      <div
        onClick={canExpand ? onToggle : undefined}
        className="flex items-center justify-between gap-4 p-[17px_22px]"
        style={{ cursor: canExpand ? 'pointer' : 'default' }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-mono text-[14px] text-text-2">{g.ref}</span>
          <span className="text-[17px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{g.vendor}</span>
          <span className="font-mono text-[12px] text-text-3">{g.country}</span>
        </div>
        <div className="flex items-center gap-[14px] flex-shrink-0">
          <span className="font-mono text-[12px] tracking-[0.06em] px-[11px] py-[5px] rounded-[2px] whitespace-nowrap" style={{ background: pillBg, color: pillColor, border: `1.5px solid ${pillBorder}` }}>{pillLabel}</span>
          {canExpand && (
            <span
              className="text-[22px] inline-block transition-transform"
              style={{ color: faint, transform: `rotate(${open ? 90 : 0}deg)` }}
            >
              &rsaquo;
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[1px]" style={{ background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {cols.map((col) => (
          <div key={col.label} className="bg-cell p-[16px_20px]">
            <div className="font-mono text-[11px] tracking-[0.1em] text-text-3 uppercase mb-2">{col.label}</div>
            <div className="text-[17px] font-medium" style={{ color: col.color }}>{col.main}</div>
            <div className="font-mono text-[12px] mt-1" style={{ color: col.subColor }}>{col.sub}</div>
          </div>
        ))}
      </div>

      {showDetail && (
        <div
          className="p-[20px_22px] border-t"
          style={
            g.isEx
              ? { borderColor: 'rgba(245,185,66,0.2)', background: 'rgba(245,185,66,0.04)', animation: 'ts-rise 0.2s ease' }
              : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)', animation: 'ts-rise 0.2s ease' }
          }
        >
          <div className="flex gap-[30px] flex-wrap">
            <div className="flex-shrink-0">
              <div className="font-mono text-[11px] tracking-[0.12em] text-text-3 mb-2">DOCUMENT TRAIL</div>
              <TrailGraph group={g} width={360} />
            </div>
            {g.isEx ? (
              <>
                <div className="flex-1 min-w-[320px]">
                  <div className="font-mono text-[11px] tracking-[0.12em] text-amber mb-2">WHAT WE FOUND</div>
                  <div className="text-[16px] text-text leading-[1.5] mb-4">{DETAIL_BODY[g.status]?.(g) || ''}</div>
                  <div className="font-mono text-[11px] tracking-[0.12em] text-emerald mb-2">RECOMMENDED ACTION</div>
                  <div className="text-[16px] text-text-soft leading-[1.5]">{DETAIL_ACTION[g.status] || ''}</div>
                </div>
                <div className="w-[260px] flex-shrink-0">
                  <div className="bg-raised rounded-[10px] p-[16px_18px] mb-[14px]" style={{ border: '1px solid rgba(242,104,95,0.3)' }}>
                    <div className="text-[13px] text-text-2">Value at risk</div>
                    <div className="font-mono text-[26px] font-medium text-coral mt-1">{k(g.risk)}</div>
                  </div>
                  <div className="font-mono text-[11px] tracking-[0.1em] text-text-3 mb-2">EVIDENCE</div>
                  {g.docNames.map((src) => (
                    <div key={src} className="font-mono text-[12px] text-text-2 py-[5px] flex items-center gap-2">
                      <span className="text-emerald">&#9633;</span>{src}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 min-w-[260px]">
                <div className="font-mono text-[11px] tracking-[0.1em] text-text-3 mb-2">EVIDENCE</div>
                <div className="flex flex-wrap gap-x-5 gap-y-[5px]">
                  {g.docNames.map((src) => (
                    <div key={src} className="font-mono text-[12px] text-text-2 flex items-center gap-2">
                      <span className="text-emerald">&#9633;</span>{src}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
