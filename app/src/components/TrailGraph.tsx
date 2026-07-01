import { useId } from 'react';
import type { GroupStatus, ReconGroup } from '../lib/types';

const TYPE_COLOR = { po: '#2fd08a', grn: '#5dc6ff', inv: '#f5b942' };
const CORAL = '#f2685f';
const FAINT = '#6f8a7e';
const SUB = '#9fb3a9';

type Kind = 'po' | 'grn' | 'inv';

interface NodeSpec {
  kind: Kind;
  label: string;
  sub: string;
  present: boolean;
  bad: boolean;
  highlight?: boolean;
}

function buildNodes(g: ReconGroup, highlightDocId?: number): NodeSpec[] {
  const poNode: NodeSpec = g.po
    ? { kind: 'po', label: 'PO', sub: g.po.fields.poRef || g.ref, present: true, bad: g.status === 'missing_po', highlight: g.po.id === highlightDocId }
    : { kind: 'po', label: 'PO', sub: 'not in batch', present: false, bad: g.status === 'missing_po' };

  const grnNode: NodeSpec = g.grns.length
    ? {
        kind: 'grn',
        label: 'GRN',
        sub: g.status === 'short' ? `${(g.recvQty || 0).toLocaleString()}/${(g.poQty || 0).toLocaleString()}u` : `${g.grns.length} receipt${g.grns.length > 1 ? 's' : ''}`,
        present: true,
        bad: g.status === 'short',
        highlight: g.grns.some((d) => d.id === highlightDocId),
      }
    : { kind: 'grn', label: 'GRN', sub: g.status === 'missing_grn' ? 'missing' : 'not received', present: false, bad: g.status === 'missing_grn' };

  const invNode: NodeSpec = g.invs.length
    ? {
        kind: 'inv',
        label: 'INV',
        sub: g.invs.length > 1 ? `${g.invs.length}× submitted` : g.inv?.fields.docId || 'on file',
        present: true,
        bad: g.status === 'price' || g.status === 'duplicate',
        highlight: g.invs.some((d) => d.id === highlightDocId),
      }
    : { kind: 'inv', label: 'INV', sub: 'awaiting', present: false, bad: false };

  return [poNode, grnNode, invNode];
}

const STATUS_CAPTION: Record<GroupStatus, string> = {
  matched: 'All three documents agree',
  price: 'Invoice exceeds the agreed PO price',
  short: 'Fewer units received than ordered',
  duplicate: 'Invoice submitted more than once',
  missing_grn: 'No goods receipt on file',
  missing_po: 'Invoice has no matching purchase order',
  await_invoice: 'Awaiting the invoice',
  orphan: 'No counterpart documents in this batch',
};

interface Props {
  group: ReconGroup;
  highlightDocId?: number;
  width?: number;
}

export default function TrailGraph({ group, highlightDocId, width = 340 }: Props) {
  const nodes = buildNodes(group, highlightDocId);
  const arrowId = useId();
  const r = 28;
  const h = 110;
  const cy = 40;
  const xs = [r + 4, width / 2, width - r - 4];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${h}`} width={width} height={h}>
        <defs>
          <marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.3)" />
          </marker>
        </defs>
        {[0, 1].map((i) => {
          const a = nodes[i];
          const b = nodes[i + 1];
          const color = a.bad || b.bad ? CORAL : !a.present || !b.present ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.3)';
          const dashed = !a.present || !b.present;
          return (
            <line
              key={i}
              x1={xs[i] + r} y1={cy} x2={xs[i + 1] - r} y2={cy}
              stroke={color} strokeWidth={2} strokeDasharray={dashed ? '4,4' : undefined}
              markerEnd={`url(#${arrowId})`}
            />
          );
        })}
        {nodes.map((n) => {
          const color = n.bad ? CORAL : !n.present ? FAINT : TYPE_COLOR[n.kind];
          const fill = n.bad ? 'rgba(242,104,95,0.14)' : n.present ? 'rgba(255,255,255,0.04)' : 'transparent';
          const x = xs[nodes.indexOf(n)];
          return (
            <g key={n.kind}>
              <circle
                cx={x} cy={cy} r={r}
                fill={fill}
                stroke={color}
                strokeWidth={n.highlight ? 3 : 2}
                strokeDasharray={!n.present ? '4,4' : undefined}
              />
              <text x={x} y={cy - 3} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight={600} fill={color}>
                {n.label}
              </text>
              <text x={x} y={cy + r + 16} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill={SUB}>
                {n.sub.length > 14 ? n.sub.slice(0, 13) + '…' : n.sub}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="font-mono text-[11px] text-text-3">{STATUS_CAPTION[group.status]}</div>
    </div>
  );
}
