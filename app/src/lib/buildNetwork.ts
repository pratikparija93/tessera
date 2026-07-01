import type { ReconGroup } from './types';
import type { GraphLink, GraphNode } from '../components/NetworkGraph';

const TYPE_COLOR: Record<string, string> = {
  po: '#2fd08a',
  grn: '#5dc6ff',
  invoice: '#f5b942',
  customs: '#b48cff',
};

const CORAL = '#f2685f';
const FAINT = 'rgba(255,255,255,0.16)';

export function buildNetwork(groups: ReconGroup[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  groups.forEach((g) => {
    const poFlag = g.status === 'missing_po';
    const grnFlag = g.status === 'missing_grn' || g.status === 'short';
    const invFlag = g.status === 'price' || g.status === 'duplicate';

    if (g.po) {
      nodes.push({ id: String(g.po.id), label: 'PO', sublabel: g.po.fields.poRef || g.ref, color: TYPE_COLOR.po, flagged: poFlag });
    }
    g.grns.forEach((d) => {
      nodes.push({ id: String(d.id), label: 'GRN', sublabel: d.fields.docId || g.ref, color: TYPE_COLOR.grn, flagged: grnFlag });
      if (g.po) links.push({ source: String(g.po.id), target: String(d.id), color: grnFlag ? CORAL : FAINT });
    });
    g.invs.forEach((d) => {
      nodes.push({ id: String(d.id), label: 'INV', sublabel: d.fields.docId || g.ref, color: TYPE_COLOR.invoice, flagged: invFlag || !g.po });
      // a missing PO leaves this node with no incoming link — that isolation is itself the signal
      if (g.po) links.push({ source: String(g.po.id), target: String(d.id), color: invFlag ? CORAL : FAINT });
    });
    g.all
      .filter((d) => d.type === 'customs')
      .forEach((d) => {
        nodes.push({ id: String(d.id), label: 'CUS', sublabel: d.fields.docId || g.ref, color: TYPE_COLOR.customs, radius: 24 });
        if (g.po) links.push({ source: String(g.po.id), target: String(d.id), color: FAINT, dashed: true });
      });
  });

  return { nodes, links };
}
