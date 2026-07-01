import { useMemo } from 'react';
import type { DocType, GroupStatus, TessDoc, View } from '../lib/types';
import { buildGroups } from '../lib/reconcile';
import { k } from '../lib/format';
import InsightsChat from './InsightsChat';

const EX_LABEL: Record<GroupStatus, string> = {
  matched: '✓ Matched', price: 'Price variance', short: 'Short delivery', duplicate: 'Duplicate invoice',
  missing_grn: 'Missing GRN', missing_po: 'No matching PO', await_invoice: 'Awaiting invoice', orphan: 'Awaiting counterpart',
};

const ACTION_TEXT: Partial<Record<GroupStatus, string>> = {
  missing_grn: 'Hold payment — no goods receipt confirms delivery',
  duplicate: 'Block duplicate invoice before it is paid twice',
  short: 'Recover short-delivered units or adjust the invoice',
  price: 'Dispute overbilling against agreed PO price',
  missing_po: 'Hold — invoice has no matching purchase order',
};

interface Props {
  docs: TessDoc[];
  reconcileDone: boolean;
  llmModel?: string;
  onGoTo: (v: View) => void;
}

export default function Insights({ docs, reconcileDone, onGoTo }: Props) {
  const doneCount = docs.filter((d) => d.status === 'done').length;
  const groups = useMemo(() => (doneCount > 0 ? buildGroups(docs) : []), [docs, doneCount]);

  if (!reconcileDone) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-[120px_20px]">
        <div className="w-[52px] h-[52px] rounded-[14px] bg-surface border border-white/8 flex items-center justify-center mb-[22px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
            <line x1="2" y1="20" x2="22" y2="20" />
          </svg>
        </div>
        <h2 className="text-[26px] font-semibold mb-[10px]">Run reconciliation to unlock insights</h2>
        <p className="text-[16px] text-text-2 mb-[26px] max-w-[460px]">
          Insights are generated from matched documents and surfaced exceptions. Complete the three-way match first.
        </p>
        <button
          onClick={() => onGoTo('recon')}
          className="bg-emerald text-emerald-ink border-none font-mono text-[14px] font-medium tracking-[0.04em] px-[22px] py-[13px] rounded-[9px] cursor-pointer"
        >
          GO TO RECONCILIATION &rarr;
        </button>
      </div>
    );
  }

  const total = docs.length;
  const routed = docs.filter((d) => d.status === 'done' && !d.isJunk).length;
  const quarN = docs.filter((d) => d.status === 'done' && d.isJunk).length;
  const exGroups = groups.filter((g) => g.isEx);
  const exN = exGroups.length;
  const riskTotal = groups.reduce((a, g) => a + (g.risk || 0), 0);
  const confDocs = docs.filter((d) => d.status === 'done' && !d.isJunk);
  const avgConf = confDocs.length ? Math.round((confDocs.reduce((a, d) => a + (d.confidence || 0), 0) / confDocs.length) * 100) : 0;

  const kpis = [
    { value: String(total), label: 'documents ingested', color: 'var(--color-text)' },
    { value: String(routed), label: 'routed to AP', color: 'var(--color-text)' },
    { value: String(quarN), label: 'quarantined', color: 'var(--color-text-2)' },
    { value: String(exN), label: 'exceptions surfaced', color: exN ? 'var(--color-amber)' : 'var(--color-text-2)' },
    { value: k(riskTotal), label: 'value at risk', color: riskTotal ? 'var(--color-coral)' : 'var(--color-text-2)' },
    { value: avgConf + '%', label: 'avg confidence', color: 'var(--color-emerald)' },
  ];

  const byType: Partial<Record<GroupStatus, number>> = {};
  exGroups.forEach((g) => { byType[g.status] = (byType[g.status] || 0) + (g.risk || 0); });
  const riskArr = Object.entries(byType).map(([status, val]) => ({ status: status as GroupStatus, val: val as number })).sort((a, b) => b.val - a.val);
  const maxRisk = Math.max(1, ...riskArr.map((r) => r.val));
  const riskBars = riskArr.map((r) => ({ label: EX_LABEL[r.status].replace('✓ ', ''), disp: k(r.val), width: ((r.val / maxRisk) * 100).toFixed(0) + '%' }));

  const mixDef: { label: string; t: DocType; color: string }[] = [
    { label: 'Invoice', t: 'invoice', color: '#2c6b52' },
    { label: 'Purchase order', t: 'po', color: '#2c6b52' },
    { label: 'Goods receipt', t: 'grn', color: '#2c6b52' },
    { label: 'Customs', t: 'customs', color: '#2c6b52' },
    { label: 'Quarantined', t: 'junk', color: '#3a4a42' },
  ];
  const mixCounts = mixDef.map((m) => ({ ...m, val: docs.filter((d) => d.status === 'done' && d.type === m.t).length })).filter((m) => m.val > 0);
  const maxMix = Math.max(1, ...mixCounts.map((m) => m.val));
  const mixBars = mixCounts.map((m) => ({ label: m.label, val: String(m.val), color: m.color, width: ((m.val / maxMix) * 100).toFixed(0) + '%' }));

  const actions = [...exGroups].sort((a, b) => (b.risk || 0) - (a.risk || 0)).map((g) => ({
    impact: k(g.risk), tag: EX_LABEL[g.status].replace('✓ ', ''), text: ACTION_TEXT[g.status] || 'Review exception', vendor: g.vendor,
  }));

  return (
    <div>
      <div className="mb-[26px]">
        <h1 className="text-[34px] font-semibold tracking-[-0.02em] mb-[6px]">Insights</h1>
        <p className="text-[16px] text-text-2">For procurement &amp; finance · generated from your reconciled documents</p>
      </div>

      <div className="grid grid-cols-6 gap-[14px] mb-[26px]">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-surface border border-border-soft rounded-[12px] p-[18px]">
            <div className="font-mono text-[24px] font-medium tracking-[-0.01em]" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[13px] text-text-2 mt-[6px] leading-[1.3]">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: '1.15fr 1fr' }}>
        <div className="bg-surface border border-border-soft rounded-[14px] p-[24px_26px]">
          <div className="text-[18px] font-semibold mb-[22px]">Value at risk by exception type</div>
          {riskBars.length > 0 ? (
            <div className="flex flex-col gap-4">
              {riskBars.map((b) => (
                <div key={b.label} className="flex items-center gap-[14px] font-mono text-[13px]">
                  <span className="w-[150px] text-text-soft flex-shrink-0">{b.label}</span>
                  <span className="h-4 rounded-[4px] bg-coral" style={{ width: b.width }} />
                  <span className="text-text-2">{b.disp}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[15px] text-text-2 py-2">No value at risk — everything reconciled cleanly.</div>
          )}
        </div>
        <div className="bg-surface border border-border-soft rounded-[14px] p-[24px_26px]">
          <div className="text-[18px] font-semibold mb-[22px]">Document mix</div>
          <div className="flex flex-col gap-4">
            {mixBars.map((m) => (
              <div key={m.label} className="flex items-center gap-[14px] font-mono text-[13px]">
                <span className="w-[130px] text-text-soft flex-shrink-0">{m.label}</span>
                <span className="h-4 rounded-[4px]" style={{ background: m.color, width: m.width }} />
                <span className="text-text-2">{m.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border-soft rounded-[14px] p-[24px_26px]">
        <div className="flex items-center justify-between mb-5">
          <div className="text-[18px] font-semibold">Action queue</div>
          <div className="font-mono text-[12px] text-text-3">prioritised by value at risk</div>
        </div>
        {actions.length > 0 ? (
          <div className="flex flex-col">
            {actions.map((a, i) => (
              <div key={i} className="flex items-center gap-5 py-[15px] border-t border-border-soft">
                <span className="font-mono text-[16px] font-medium text-coral w-[84px] flex-shrink-0">{a.impact}</span>
                <span
                  className="font-mono text-[11px] tracking-[0.03em] px-[9px] py-1 rounded-[5px] whitespace-nowrap text-center flex-shrink-0"
                  style={{ width: 150, background: 'rgba(245,185,66,0.13)', color: '#f5b942' }}
                >
                  {a.tag}
                </span>
                <span className="text-[15px] text-text flex-1 min-w-0">{a.text}</span>
                <span className="text-[14px] text-text-2 flex-shrink-0">{a.vendor}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[15px] text-text-2 py-[6px]">No open actions — all documents cleared.</div>
        )}
      </div>

      <div className="mt-6">
        <InsightsChat docs={docs} groups={groups} />
      </div>
    </div>
  );
}
