import type { GroupStatus, ReconGroup, TessDoc } from './types';

const EXCEPTION_STATUSES: Record<string, true> = { duplicate: true, missing_po: true, missing_grn: true, short: true, price: true };

function norm(s: string | null | undefined): string {
  return (s || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function buildGroups(docs: TessDoc[]): ReconGroup[] {
  const done = docs.filter((d) => d.status === 'done' && !d.isJunk);
  const map = new Map<string, TessDoc[]>();
  let solo = 0;
  done.forEach((d) => {
    let key = d.type === 'po' ? norm(d.fields.poRef || d.fields.docId) : norm(d.fields.poRef);
    if (!key) key = '__solo_' + solo++ + '_' + d.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  });
  return [...map.entries()].map(([key, ds]) => evalGroup(key, ds));
}

function evalGroup(key: string, ds: TessDoc[]): ReconGroup {
  const po = ds.find((d) => d.type === 'po');
  const grns = ds.filter((d) => d.type === 'grn');
  const invs = ds.filter((d) => d.type === 'invoice');
  const anchor = po || invs[0] || ds[0];
  const f = anchor.fields || {};

  const cur = f.currency || po?.fields.currency || invs[0]?.fields.currency || 'USD';
  const ref = po?.fields.poRef || invs[0]?.fields.poRef || f.docId || '—';
  const vendor = f.vendor || po?.fields.vendor || invs[0]?.fields.vendor || 'Unknown vendor';
  const country = f.country || po?.fields.country || invs[0]?.fields.country || '—';
  const poTotal = po ? po.fields.total ?? null : null;
  const inv = invs[0];
  const invTotal = inv ? inv.fields.total ?? null : null;

  let status: GroupStatus = 'matched';
  let risk = 0;

  if (invs.length > 1) {
    status = 'duplicate';
    risk = invTotal || 0;
  } else if (po && !inv) {
    status = 'await_invoice';
  } else if (!po && inv) {
    status = 'missing_po';
    risk = invTotal || 0;
  } else if (po && inv) {
    const poQty = po.fields.qty ?? null;
    const recvQty = grns.length ? grns[0].fields.qty ?? null : null;
    if (grns.length === 0) {
      status = 'missing_grn';
      risk = invTotal || 0;
    } else if (poQty && recvQty && recvQty < poQty) {
      status = 'short';
      risk = (poTotal || invTotal || 0) * (1 - recvQty / poQty);
    } else if (poTotal && invTotal && invTotal > poTotal * 1.02) {
      status = 'price';
      risk = invTotal - poTotal;
    } else {
      status = 'matched';
    }
  } else if (!po && !inv) {
    status = 'orphan';
  }

  const isEx = !!EXCEPTION_STATUSES[status];
  const recvQty = grns.length ? grns[0].fields.qty ?? null : null;
  const poQty = po ? po.fields.qty ?? null : null;

  return {
    key, ref, vendor, country, cur, po, grns, invs, inv, poTotal, invTotal, poQty, recvQty, status, risk, isEx,
    docNames: ds.map((d) => d.name),
    all: ds,
  };
}
