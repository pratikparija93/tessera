import { describe, it, expect } from 'vitest';
import { heuristicClassify } from '../classify';

describe('heuristicClassify', () => {
  it('classifies purchase order by keyword', () => {
    const r = heuristicClassify('order.pdf', 'Purchase Order No. PO-2024-001 from Acme Corp');
    expect(r.type).toBe('po');
    expect(r.confidence).toBeGreaterThan(0.8);
  });

  it('classifies invoice by keyword', () => {
    const r = heuristicClassify('inv.pdf', 'Tax Invoice — Amount Due: $1,200.00');
    expect(r.type).toBe('invoice');
  });

  it('classifies GRN by "goods receipt" keyword', () => {
    const r = heuristicClassify('delivery.pdf', 'Goods Receipt Note — 50 units received');
    expect(r.type).toBe('grn');
  });

  it('classifies customs doc by hs code', () => {
    const r = heuristicClassify('customs.pdf', 'Customs Declaration — HS Code 8471.30 import duty applied');
    expect(r.type).toBe('customs');
  });

  it('classifies out-of-office as junk', () => {
    const r = heuristicClassify('re: vacation.eml', 'Out of office: I am away until Monday');
    expect(r.type).toBe('junk');
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('classifies newsletter as junk', () => {
    const r = heuristicClassify('newsletter.eml', 'Unsubscribe from this mailing list. Click here.');
    expect(r.type).toBe('junk');
  });

  it('extracts PO reference from text', () => {
    const r = heuristicClassify('doc.pdf', 'Invoice for P.O. #20241105 dated November 2024');
    expect(r.fields.poRef ?? '').toMatch(/20241105/);
  });

  it('extracts invoice docId', () => {
    const r = heuristicClassify('inv.pdf', 'Invoice Number: INV-9900 from vendor');
    expect(r.fields.docId).toBe('INV-9900');
  });

  it('extracts currency symbol €', () => {
    const r = heuristicClassify('doc.pdf', 'Total Amount Due: €4,200.00');
    expect(r.fields.currency).toBe('EUR');
  });

  it('extracts the largest total amount', () => {
    const r = heuristicClassify('doc.pdf', 'Subtotal: 800.00\nTotal amount due: 1,200.00\nBalance: 1,200.00');
    expect(r.fields.total).toBe(1200);
  });

  it('extracts quantity in units', () => {
    const r = heuristicClassify('doc.pdf', 'Quantity: 250 units ordered');
    expect(r.fields.qty).toBe(250);
  });

  it('returns junk for empty input', () => {
    const r = heuristicClassify('', '');
    expect(r.type).toBe('junk');
  });

  it('filename alone can trigger classification', () => {
    const r = heuristicClassify('invoice_march.pdf', '');
    expect(r.type).toBe('invoice');
  });

  it('GRN via packing list keyword', () => {
    const r = heuristicClassify('pack_list.pdf', 'Packing List — Shipment #SHP-99 — 10 cartons');
    expect(r.type).toBe('grn');
  });
});
