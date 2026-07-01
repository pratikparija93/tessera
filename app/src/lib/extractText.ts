import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const TEXT_EXT = /\.(txt|csv|tsv|json|eml|html?|md|xml|log|rtf|yaml|yml|ini)$/;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|tiff?|heic|svg)$/;

export async function extractText(file: File): Promise<string> {
  const name = (file.name || '').toLowerCase();

  if (TEXT_EXT.test(name)) {
    try { return (await file.text()).slice(0, 8000); } catch { return ''; }
  }

  if (/\.pdf$/.test(name)) {
    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const pages = Math.min(pdf.numPages, 6);
      let out = '';
      for (let i = 1; i <= pages; i++) {
        const pg = await pdf.getPage(i);
        const tc = await pg.getTextContent();
        out += tc.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n';
      }
      return out.slice(0, 8000);
    } catch { return ''; }
  }

  if (IMAGE_EXT.test(name)) return '';

  try {
    const t = await file.text();
    const printable = t.replace(/[^\x20-\x7E\s]/g, '').length / Math.max(t.length, 1);
    return printable > 0.7 ? t.slice(0, 8000) : '';
  } catch { return ''; }
}
