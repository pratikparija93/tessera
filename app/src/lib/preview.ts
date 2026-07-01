import type { DocFields, DocType } from './types';

const TYPE_LABEL: Record<DocType, string> = {
  po: 'PURCHASE ORDER', invoice: 'INVOICE', grn: 'GOODS RECEIPT NOTE', customs: 'CUSTOMS DECLARATION', junk: 'UNCLASSIFIED',
};
const TYPE_COLOR: Record<DocType, string> = { po: '#2fd08a', invoice: '#2fd08a', grn: '#2fd08a', customs: '#2fd08a', junk: '#6f8a7e' };

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Renders a stylized stand-in page for documents with no real scanned/uploaded content. */
export function buildMockPreview(name: string, type: DocType | null, fields: DocFields, isJunk: boolean): string {
  const t = type || 'junk';
  const accent = isJunk ? TYPE_COLOR.junk : TYPE_COLOR[t];
  const label = isJunk ? 'UNCLASSIFIED / NOISE' : TYPE_LABEL[t];
  const lines: [string, string][] = [
    ['Vendor', fields.vendor || '—'],
    ['Country', fields.country || '—'],
    ['Document ID', fields.docId || '—'],
    ['PO reference', fields.poRef || '—'],
    ['Total', fields.total != null ? `${fields.currency || ''} ${fields.total.toLocaleString()}` : '—'],
    ['Quantity', fields.qty != null ? String(fields.qty) : '—'],
  ];
  const rows = lines
    .map(([k, v], i) => `
      <text x="36" y="${182 + i * 30}" font-family="JetBrains Mono, monospace" font-size="11" fill="#6f8a7e" letter-spacing="0.5">${esc(k.toUpperCase())}</text>
      <text x="220" y="${182 + i * 30}" font-family="JetBrains Mono, monospace" font-size="13" fill="#1c2620">${esc(v)}</text>
    `)
    .join('');

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="780" viewBox="0 0 600 780">
  <rect width="600" height="780" fill="#f7faf8"/>
  <rect width="600" height="86" fill="${accent}" opacity="0.12"/>
  <rect x="0" y="84" width="600" height="2" fill="${accent}"/>
  <text x="36" y="40" font-family="JetBrains Mono, monospace" font-size="12" letter-spacing="2" fill="${accent}">${esc(label)}</text>
  <text x="36" y="66" font-family="Schibsted Grotesk, sans-serif" font-size="18" font-weight="600" fill="#1c2620">${esc(name)}</text>
  ${rows}
  <text x="36" y="${182 + lines.length * 30 + 24}" font-family="JetBrains Mono, monospace" font-size="11" fill="#6f8a7e">${esc(fields.summary || 'No summary extracted')}</text>
  ${Array.from({ length: 9 }).map((_, i) => `<rect x="36" y="${430 + i * 26}" width="${520 - (i % 3) * 60}" height="6" rx="3" fill="#e3ece6"/>`).join('')}
  <text x="36" y="752" font-family="JetBrains Mono, monospace" font-size="10" fill="#a9bdb2">tessera · synthetic preview, no source scan available</text>
</svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function isImageFile(name: string) {
  return /\.(png|jpe?g|webp|bmp|tiff?|gif|heic)$/i.test(name);
}
export function isPdfFile(name: string) {
  return /\.pdf$/i.test(name);
}
