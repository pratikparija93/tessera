import { useEffect, useMemo, useRef, useState } from 'react';
import type { TessDoc, View } from '../lib/types';
import { buildGroups } from '../lib/reconcile';
import { buildNetwork } from '../lib/buildNetwork';
import { k } from '../lib/format';
import NetworkGraph from './NetworkGraph';

interface Props {
  docs: TessDoc[];
  onGoTo: (v: View) => void;
  onSelectDoc: (id: number) => void;
}

type FilterMode = 'all' | 'exceptions' | 'matched';

const LEGEND = [
  { label: 'Purchase order', color: '#2fd08a' },
  { label: 'Goods receipt', color: '#5dc6ff' },
  { label: 'Invoice', color: '#f5b942' },
  { label: 'Customs', color: '#b48cff' },
];

const FILTER_TABS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'exceptions', label: 'Exceptions only' },
  { key: 'matched', label: 'Matched only' },
];

export default function Linkage({ docs, onGoTo, onSelectDoc }: Props) {
  const doneCount = docs.filter((d) => d.status === 'done').length;
  const groups = useMemo(() => (doneCount > 0 ? buildGroups(docs) : []), [docs, doneCount]);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [vendorSearch, setVendorSearch] = useState('');

  const filteredGroups = useMemo(() => {
    let g = groups;
    if (filter === 'exceptions') g = g.filter((x) => x.isEx);
    if (filter === 'matched')    g = g.filter((x) => x.status === 'matched');
    if (vendorSearch.trim()) {
      const q = vendorSearch.trim().toLowerCase();
      g = g.filter((x) => x.vendor?.toLowerCase().includes(q));
    }
    return g;
  }, [groups, filter, vendorSearch]);

  const { nodes, links } = useMemo(() => buildNetwork(filteredGroups), [filteredGroups]);
  const totalNodes = useMemo(() => buildNetwork(groups).nodes.length, [groups]);

  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (doneCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-[120px_20px]">
        <div className="w-[52px] h-[52px] rounded-[14px] bg-surface border border-white/8 flex items-center justify-center text-[24px] text-text-3 mb-[22px]">&#9737;</div>
        <h2 className="text-[26px] font-semibold mb-[10px]">Ingest some documents first</h2>
        <p className="text-[16px] text-text-2 mb-[26px] max-w-[460px]">
          The linkage map plots every document in this batch as a connected network. Upload or load a sample set and run ingestion to populate it.
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

  const exN = groups.filter((g) => g.isEx).length;
  const matchedN = groups.filter((g) => g.status === 'matched').length;
  const riskTotal = groups.reduce((a, g) => a + (g.risk || 0), 0);
  const isFiltered = filter !== 'all' || vendorSearch.trim().length > 0;

  // Taller canvas for large graphs
  const canvasHeight = nodes.length > 80 ? 720 : nodes.length > 40 ? 640 : 580;

  return (
    <div>
      <div className="flex items-end justify-between gap-6 mb-5">
        <div>
          <h1 className="text-[34px] font-semibold tracking-[-0.02em] mb-[6px]">Linkage</h1>
          <p className="text-[16px] text-text-2">
            {isFiltered
              ? `${nodes.length} of ${totalNodes} documents shown · ${filteredGroups.length} of ${groups.length} groups`
              : `${nodes.length} documents · ${matchedN} matched · ${exN} exceptions`}
            {' '}— drag nodes, scroll to zoom, click to inspect
          </p>
        </div>
        {riskTotal > 0 && (
          <div className="font-mono text-[12px] tracking-[0.05em] px-[12px] py-[6px] rounded-[2px] flex-shrink-0" style={{ color: 'var(--color-coral)', border: '1.5px solid rgba(242,104,95,0.4)', background: 'rgba(242,104,95,0.06)' }}>
            {k(riskTotal)} AT RISK · {exN} EXCEPTIONS
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-[3px] bg-surface border border-border-soft rounded-[9px] p-[3px]">
          {FILTER_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className="font-mono text-[12px] tracking-[0.04em] px-[12px] py-[6px] rounded-[7px] border-none cursor-pointer transition-colors"
              style={filter === t.key
                ? { background: 'transparent', color: 'var(--color-emerald)', border: '1.5px solid rgba(47,208,138,0.5)' }
                : { background: 'transparent', color: 'var(--color-text-2)', border: '1.5px solid transparent' }
              }
            >{t.label}</button>
          ))}
        </div>
        <input
          type="text"
          value={vendorSearch}
          onChange={(e) => setVendorSearch(e.target.value)}
          placeholder="Filter by vendor…"
          className="bg-surface border border-border-soft rounded-[8px] px-[12px] py-[7px] text-[13px] text-text placeholder:text-text-3 outline-none focus:border-emerald/50 transition-colors w-[200px]"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
        {isFiltered && (
          <button
            onClick={() => { setFilter('all'); setVendorSearch(''); }}
            className="font-mono text-[12px] text-text-3 hover:text-text-2 border border-border-soft rounded-[7px] px-[10px] py-[7px] bg-transparent cursor-pointer transition-colors"
          >CLEAR</button>
        )}
        {nodes.length === 0 && isFiltered && (
          <span className="font-mono text-[12px] text-text-3">No groups match this filter</span>
        )}
      </div>

      <div ref={stageRef} className="bg-surface border border-border-soft rounded-[14px] overflow-hidden mb-4">
        <NetworkGraph
          nodes={nodes}
          links={links}
          width={width}
          height={canvasHeight}
          onNodeClick={(id) => onSelectDoc(Number(id))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-2 font-mono text-[12px] text-text-2">
            <span className="w-[8px] h-[8px] rounded-[1px] flex-shrink-0" style={{ border: `1.5px solid ${l.color}` }} />
            {l.label}
          </div>
        ))}
        <div className="flex items-center gap-2 font-mono text-[12px] text-text-2">
          <span className="w-[8px] h-[8px] rounded-[1px] flex-shrink-0" style={{ border: '1.5px solid #f2685f', background: 'rgba(242,104,95,0.2)' }} />
          flagged / exception leg
        </div>
        {nodes.length > 50 && (
          <span className="font-mono text-[12px] text-text-3 ml-auto">
            compact mode · sublabels on exceptions only · scroll to zoom
          </span>
        )}
      </div>
    </div>
  );
}
