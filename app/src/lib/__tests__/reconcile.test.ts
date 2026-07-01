import { describe, it, expect } from 'vitest';
import { buildGroups } from '../reconcile';
import type { TessDoc, DocFields } from '../types';

let _id = 1;

function doc(
  type: TessDoc['type'],
  fields: Partial<DocFields> = {},
  overrides: Partial<TessDoc> = {},
): TessDoc {
  return {
    id: _id++,
    name: `doc-${_id}.pdf`,
    source: 'test',
    synthetic: false,
    status: 'done',
    type,
    confidence: 0.9,
    fields: { vendor: null, country: null, currency: 'USD', docId: null, poRef: null, total: null, qty: null, summary: null, ...fields },
    isJunk: false,
    needsReview: false,
    ...overrides,
  };
}

describe('buildGroups', () => {
  it('returns empty array for no done docs', () => {
    expect(buildGroups([])).toEqual([]);
  });

  it('excludes queued and classifying docs', () => {
    const d = doc('po', { poRef: 'PO-001' }, { status: 'queued' });
    expect(buildGroups([d])).toEqual([]);
  });

  it('excludes junk docs', () => {
    const d = doc('junk', {}, { isJunk: true });
    expect(buildGroups([d])).toEqual([]);
  });

  it('matched — PO + GRN + Invoice within 2% tolerance', () => {
    const po  = doc('po',      { poRef: 'PO-100', total: 1000, qty: 10 });
    const grn = doc('grn',     { poRef: 'PO-100', qty: 10 });
    const inv = doc('invoice', { poRef: 'PO-100', total: 1010 });
    const [g] = buildGroups([po, grn, inv]);
    expect(g.status).toBe('matched');
    expect(g.risk).toBe(0);
    expect(g.isEx).toBe(false);
  });

  it('await_invoice — PO exists, no invoice yet', () => {
    const po  = doc('po',  { poRef: 'PO-200', total: 500 });
    const grn = doc('grn', { poRef: 'PO-200' });
    const [g] = buildGroups([po, grn]);
    expect(g.status).toBe('await_invoice');
    expect(g.isEx).toBe(false);
  });

  it('missing_po — invoice with no matching PO', () => {
    const inv = doc('invoice', { poRef: 'PO-999', total: 750 });
    const [g] = buildGroups([inv]);
    expect(g.status).toBe('missing_po');
    expect(g.risk).toBe(750);
    expect(g.isEx).toBe(true);
  });

  it('missing_grn — PO + Invoice but no GRN', () => {
    const po  = doc('po',      { poRef: 'PO-300', total: 2000 });
    const inv = doc('invoice', { poRef: 'PO-300', total: 1950 });
    const [g] = buildGroups([po, inv]);
    expect(g.status).toBe('missing_grn');
    expect(g.risk).toBe(1950);
    expect(g.isEx).toBe(true);
  });

  it('short — GRN qty < PO qty', () => {
    const po  = doc('po',      { poRef: 'PO-400', total: 1000, qty: 100 });
    const grn = doc('grn',     { poRef: 'PO-400', qty: 80 });
    const inv = doc('invoice', { poRef: 'PO-400', total: 1000 });
    const [g] = buildGroups([po, grn, inv]);
    expect(g.status).toBe('short');
    expect(g.risk).toBeCloseTo(200);
    expect(g.isEx).toBe(true);
  });

  it('price — invoice total exceeds PO total by >2%', () => {
    const po  = doc('po',      { poRef: 'PO-500', total: 10000 });
    const grn = doc('grn',     { poRef: 'PO-500', qty: 5 });
    const inv = doc('invoice', { poRef: 'PO-500', total: 10300 });
    const [g] = buildGroups([po, grn, inv]);
    expect(g.status).toBe('price');
    expect(g.risk).toBeCloseTo(300);
    expect(g.isEx).toBe(true);
  });

  it('price — invoice at exactly 2% over is NOT a price exception', () => {
    const po  = doc('po',      { poRef: 'PO-501', total: 10000 });
    const grn = doc('grn',     { poRef: 'PO-501', qty: 5 });
    const inv = doc('invoice', { poRef: 'PO-501', total: 10200 });
    const [g] = buildGroups([po, grn, inv]);
    expect(g.status).toBe('matched');
  });

  it('duplicate — two invoices for the same PO', () => {
    const po   = doc('po',      { poRef: 'PO-600', total: 5000 });
    const inv1 = doc('invoice', { poRef: 'PO-600', total: 5000 });
    const inv2 = doc('invoice', { poRef: 'PO-600', total: 5000 });
    const [g] = buildGroups([po, inv1, inv2]);
    expect(g.status).toBe('duplicate');
    expect(g.isEx).toBe(true);
  });

  it('groups multiple PO refs into separate groups', () => {
    const po1  = doc('po',      { poRef: 'PO-700' });
    const inv1 = doc('invoice', { poRef: 'PO-700', total: 100 });
    const po2  = doc('po',      { poRef: 'PO-701' });
    const inv2 = doc('invoice', { poRef: 'PO-701', total: 200 });
    const groups = buildGroups([po1, inv1, po2, inv2]);
    expect(groups).toHaveLength(2);
  });

  it('PO groups by its own docId when poRef is absent', () => {
    const po = doc('po', { docId: 'PO-800', poRef: null });
    const [g] = buildGroups([po]);
    expect(g.status).toBe('await_invoice');
    expect(g.ref).toBe('PO-800');
  });

  it('short risk uses invTotal when poTotal is null', () => {
    const po  = doc('po',      { poRef: 'PO-900', total: null, qty: 100 });
    const grn = doc('grn',     { poRef: 'PO-900', qty: 60 });
    const inv = doc('invoice', { poRef: 'PO-900', total: 800 });
    const [g] = buildGroups([po, grn, inv]);
    expect(g.status).toBe('short');
    expect(g.risk).toBeCloseTo(800 * 0.4);
  });
});
