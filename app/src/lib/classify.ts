import type { ClassifyResult, DocFields, DocType } from './types';
import { money, num } from './format';

// Override without editing code:
//   localStorage.tessera_llm_model = 'gemma2'
//   localStorage.tessera_llm_endpoint = 'http://localhost:1234/v1/chat/completions'
export function llmEndpoint(): string {
  try {
    return (localStorage.getItem('tessera_llm_endpoint') || '').trim() || 'http://localhost:11434/api/generate';
  } catch { return 'http://localhost:11434/api/generate'; }
}

export function llmModel(): string {
  try {
    return (localStorage.getItem('tessera_llm_model') || '').trim() || 'gemma3';
  } catch { return 'gemma3'; }
}

export async function classify(name: string, text: string): Promise<ClassifyResult> {
  try {
    return await modelClassify(name, text);
  } catch (e) {
    console.warn('[Tessera] local model unreachable — using keyword fallback. ' + (e instanceof Error ? e.message : e));
  }
  return heuristicClassify(name, text);
}

export async function modelClassify(name: string, text: string): Promise<ClassifyResult> {
  const body = text && text.trim()
    ? text.slice(0, 6000)
    : '(no extractable text — likely a scanned image or binary file; infer the type from the filename only and set a low confidence)';
  const prompt =
    'You are a procurement document-intelligence engine for an accounts-payable team. Classify ONE document and extract its key fields.\n' +
    'Respond with ONLY a single minified JSON object — no prose, no markdown fences. Schema:\n' +
    '{"type":"purchase_order|invoice|goods_receipt|customs|junk","confidence":0-1,"vendor":string|null,"country":string|null,"currency":"ISO4217 code"|null,"doc_id":string|null,"po_reference":string|null,"total_amount":number|null,"quantity":number|null,"summary":"max 12 words","reasoning":"one sentence on why you chose this type","signals":["a concrete phrase or cue you found","another cue"]}\n' +
    'Rules: "junk" = anything that is NOT a procurement document (personal/marketing email, spam, out-of-office, newsletter, photo, notice). "goods_receipt" = delivery note / GRN / packing list. po_reference is the purchase-order number the document relates to. total_amount is a plain number with no symbols or commas. signals must quote real evidence from the document text. Use null for any absent field.\n\n' +
    'FILENAME: ' + name + '\nDOCUMENT TEXT:\n' + body;

  const endpoint = llmEndpoint();
  const isOpenAI = /\/(chat\/)?completions$/.test(endpoint) || /\/v1\b/.test(endpoint);
  const payload = isOpenAI
    ? { model: llmModel(), messages: [{ role: 'user', content: prompt }], temperature: 0.1, stream: false }
    : { model: llmModel(), prompt, stream: false, format: 'json', options: { temperature: 0.1 } };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status + ' from ' + endpoint);
  const data = await resp.json();
  const raw = isOpenAI ? data?.choices?.[0]?.message?.content : data?.response;
  const j = parseJson(raw || '');

  const map: Record<string, DocType> = { purchase_order: 'po', invoice: 'invoice', goods_receipt: 'grn', customs: 'customs', junk: 'junk' };
  const type = map[j.type] || 'junk';

  return {
    type,
    confidence: typeof j.confidence === 'number' ? j.confidence : 0.8,
    reasoning: j.reasoning || null,
    signals: Array.isArray(j.signals) ? j.signals.filter(Boolean).map(String) : null,
    fields: {
      vendor: j.vendor || null,
      country: j.country || null,
      currency: j.currency || null,
      docId: j.doc_id || null,
      poRef: j.po_reference || null,
      total: num(j.total_amount),
      qty: num(j.quantity),
      summary: j.summary || null,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJson(raw: string): any {
  if (!raw) return { type: 'junk', confidence: 0.4 };
  let s = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch { return { type: 'junk', confidence: 0.4 }; }
}

export function heuristicClassify(name: string, text: string): ClassifyResult {
  const hay = ((name || '') + ' ' + (text || '')).toLowerCase();
  const has = (re: RegExp) => re.test(hay);
  let type: DocType = 'junk';
  let conf = 0.62;

  if (has(/out of office|unsubscribe|newsletter|verify your|reset your password|meeting notes|holiday|\bspam\b|click here|^re:|\bre:\s/)) { type = 'junk'; conf = 0.9; }
  else if (has(/purchase order|p\.?\s?o\.?\s*(no|number|#|:)|order confirmation/)) { type = 'po'; conf = 0.84; }
  else if (has(/goods received|goods receipt|\bgrn\b|delivery note|packing list/)) { type = 'grn'; conf = 0.84; }
  else if (has(/customs|declaration|hs code|tariff|import duty|bill of lading/)) { type = 'customs'; conf = 0.82; }
  else if (has(/invoice|tax invoice|amount due|bill to|remittance|vat/)) { type = 'invoice'; conf = 0.84; }

  const fields: DocFields = { vendor: null, country: null, currency: null, docId: null, poRef: null, total: null, qty: null, summary: null };
  const txt = text || '';

  const po = txt.match(/p\.?\s?o\.?[\s#:\-]*([A-Z0-9][A-Z0-9\-]{2,})/i) || txt.match(/purchase order[^A-Z0-9]{0,14}([A-Z0-9][A-Z0-9\-]{2,})/i);
  if (po) fields.poRef = ('PO-' + po[1].replace(/^po-?/i, '')).toUpperCase();

  const inv = txt.match(/invoice[\s#:\-]*(?:no\.?|number)?[\s:#]*([A-Z0-9][A-Z0-9\-]{2,})/i);
  if (inv) fields.docId = inv[1].toUpperCase();

  const sym = txt.match(/(€|£|R\$|S\$|\$|USD|EUR|GBP|BRL|SGD)/);
  if (sym) {
    const m: Record<string, string> = { '€': 'EUR', '£': 'GBP', 'R$': 'BRL', 'S$': 'SGD', '$': 'USD' };
    fields.currency = m[sym[1]] || sym[1].toUpperCase();
  }

  const amounts = [...txt.matchAll(/(?:total|amount due|grand total|balance)[^0-9]{0,12}([0-9][0-9.,]{2,})/gi)]
    .map((m) => num(m[1]))
    .filter((n): n is number => n != null);
  if (amounts.length) fields.total = Math.max(...amounts);

  const qm = txt.match(/([0-9,]{1,9})\s*(units|pcs|pieces|qty|ea\b)/i);
  if (qm) fields.qty = num(qm[1]);

  fields.summary = type === 'junk' ? 'Not a procurement document' : 'Classified by keyword fallback';

  return { type, confidence: conf, fields };
}

const TYPE_NOUN: Record<DocType, string> = {
  po: 'a purchase order', invoice: 'an invoice', grn: 'a goods-received note', customs: 'a customs declaration', junk: 'not a procurement document',
};
const TYPE_KEYWORDS: Partial<Record<DocType, string>> = {
  po: 'purchase-order language', invoice: 'invoice / amount-due language', grn: 'goods-received / delivery-note language', customs: 'customs-declaration language', junk: 'email / notice language',
};

export function explain(type: DocType | null, f: DocFields, name: string): { reasoning: string; signals: string[] } {
  f = f || {};
  const tn = (type && TYPE_NOUN[type]) || 'a document';
  const kw = type ? TYPE_KEYWORDS[type] : undefined;
  const signals: string[] = [];
  if (kw) signals.push('Document language indicates ' + kw);
  if (f.docId) signals.push('Document ID detected: ' + f.docId);
  if (f.poRef) signals.push('References purchase order ' + f.poRef);
  if (f.vendor) signals.push('Vendor named: ' + f.vendor);
  if (f.total != null) signals.push('Monetary total present: ' + money(f.currency, f.total));
  if (f.qty != null) signals.push('Quantity present: ' + Number(f.qty).toLocaleString() + ' units');
  if (/\.(png|jpe?g|gif|webp|bmp|tiff?|heic|svg)$/i.test(name || '')) signals.push('No extractable text — inferred from filename');
  if (!signals.length) signals.push('Filename and content cues: ' + (name || 'document'));
  const reasoning = 'Classified as ' + tn + ' from its layout and key fields' + (f.poRef ? ', and linked to ' + f.poRef + ' for reconciliation' : '') + '.';
  return { reasoning, signals };
}
